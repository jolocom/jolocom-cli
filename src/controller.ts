import { JolocomLib, claimsMetadata } from 'jolocom-lib'
import {
  getStaxConfiguredContractsConnector,
  getStaxConfiguredStorageConnector,
  getStaxConfiguredContractsGateway
} from 'jolocom-lib-stax-connector'
import * as fs from 'fs'
import axios from 'axios'
import attrCheck from './validation'
import { createJolocomRegistry } from 'jolocom-lib/js/registries/jolocomRegistry'
import { ContractsAdapter } from 'jolocom-lib/js/contracts/contractsAdapter'
import { IVaultedKeyProvider } from 'jolocom-lib/js/vaultedKeyProvider/types'
import { IRegistry } from 'jolocom-lib/js/registries/types'
import { keyIdToDid, publicKeyToAddress } from 'jolocom-lib/js/utils/helper'
import { awaitPaymentTxConfirmation, fuelAddress, getStaxEndpoints } from 'jolocom-lib-stax-connector/js/utils'

interface IDParameters {
  idArgs?: { seed: Buffer; password: string }
  dep?: { endpoint: string; contract: string }
}

const httpAgent = {
  getRequest: endpoint => {
    return axios.get(endpoint).then(res => res.data)
  },

  postRequest: (endpoint, headers, data) => {
    return axios.post(endpoint, data, { headers }).then(res => res.data)
  },

  headRequest: endpoint => {
    return axios
      .head(endpoint)
      .then(res => res)
      .catch(err => err)
  }
}

const get_infrastructure = async (
  params?: IDParameters
): Promise<{ vkp: IVaultedKeyProvider; reg: IRegistry; password: string }> => {
  const idArgs = (params && params.idArgs) || {
    seed: Buffer.from('a'.repeat(64), 'hex'),
    password: 'secret'
  }

  return {
    vkp: new JolocomLib.KeyProvider(idArgs.seed, idArgs.password),
    reg: params.dep
      ? createJolocomRegistry({
          ethereumConnector: getStaxConfiguredContractsConnector(
            params.dep.endpoint,
            params.dep.contract || '0x32dacb62d2fe618697f192cda3abc50426e5486c',
            httpAgent
          ),
          ipfsConnector: getStaxConfiguredStorageConnector(params.dep.endpoint, httpAgent),
          contracts: {
            gateway: getStaxConfiguredContractsGateway(params.dep.endpoint, 777, httpAgent),
            adapter: new ContractsAdapter(777)
          }
        })
      : JolocomLib.registries.jolocom.create(),
    password: idArgs.password
  }
}

export const create = async (params?: IDParameters) => {
  const { vkp, reg, password } = await get_infrastructure(params)
  return reg.create(vkp, password)
}

export const fuel = async (amount: number, params?: IDParameters) => {
  const { vkp, password } = await get_infrastructure(params)
  const publicKey = vkp.getPublicKey({
    derivationPath: JolocomLib.KeyTypes.ethereumKey,
    encryptionPass: password
  })

  return params.dep
    ? fuelAddress(
        getStaxEndpoints(params.dep.endpoint).userInfoEndpoint,
        publicKeyToAddress(publicKey),
        httpAgent,
        amount
      ).then(txHash =>
        awaitPaymentTxConfirmation(getStaxEndpoints(params.dep.endpoint).paymentEndpoint, txHash, httpAgent)
      )
    : JolocomLib.util.fuelKeyWithEther(publicKey)
}

export const Controller = async (params?: IDParameters) => {
  const { vkp, reg, password } = await get_infrastructure(params)
  const idw = await reg.authenticate(vkp, {
    derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
    encryptionPass: password
  })
  const tokens = idw.create.interactionTokens

  var interactions: {}
  const dir = __dirname + '/interactions/' + idw.did.slice(10, 30)
  try {
    interactions = JSON.parse(fs.readFileSync(dir + '/interactions.json', 'utf8'))
  } catch {
    interactions = {}
  }

  type DidInfo = {
    did: string
    created: Date
  }

  return {
    getDidInfo: (): DidInfo => {
      return {
        did: idw.did,
        created: idw.didDocument.created
      }
    },
    clearInteractions: (): void => {
      interactions = {}
    },
    generateRequest: async (typ: string, attrs: any): Promise<string> => {
      if (!attrCheck.request[typ](attrs)) {
        return 'Error: Incorrect token attribute form for interaction type ' + typ + ' request'
      }
      try {
        const token = await tokens.request[typ](attrs, password)
        interactions[token.nonce] = token
        return token.encode()
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error
      }
    },
    createKeyCloakCredentials: async (name: string, email: string) => {
      const idw = await reg.authenticate(vkp, {
        derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
        encryptionPass: password
      })

      const nameCred = await idw.create.signedCredential(
        {
          metadata: claimsMetadata.name,
          claim: {
            familyName: name,
            givenName: name
          },
          subject: idw.did
        },
        password
      )

      const emailCred = await idw.create.signedCredential(
        {
          metadata: claimsMetadata.emailAddress,
          claim: {
            email: email
          },
          subject: idw.did
        },
        password
      )

      return { nameCred, emailCred }
    },
    generateResponse: async (typ: string, attrs: any, recieved?: string): Promise<string> => {
      if (!attrCheck.response[typ](attrs)) {
        return 'Error: Incorrect token attribute form for interaction type ' + typ + ' response'
      }
      try {
        const token = await tokens.response[typ](attrs, password, JolocomLib.parse.interactionToken.fromJWT(recieved))
        return token.encode()
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error
      }
    },
    isInteractionResponseValid: async (response: string): Promise<{ responder: string; validity: boolean }> => {
      const resp = JolocomLib.parse.interactionToken.fromJWT(response)
      const req = JolocomLib.parse.interactionToken.fromJSON(interactions[resp.nonce])

      try {
        await idw.validateJWT(resp, req, reg)
        delete interactions[resp.nonce]
        return { responder: keyIdToDid(resp.issuer), validity: true }
      } catch (err) {
        return { responder: keyIdToDid(resp.issuer), validity: false }
      }
    },
    close: () => {
      try {
        fs.writeFileSync(dir + '/interactions.json', JSON.stringify(interactions), 'utf8')
      } catch {
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(dir + '/interactions.json', JSON.stringify(interactions), 'utf8')
      }
    }
  }
}
