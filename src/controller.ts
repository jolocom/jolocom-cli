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
import { Identity } from 'jolocom-lib/js/identity/identity'
import { IVaultedKeyProvider } from 'jolocom-lib/js/vaultedKeyProvider/types'
import { JolocomRegistry } from 'jolocom-lib/js/registries/jolocomRegistry'
import { keyIdToDid, publicKeyToAddress } from 'jolocom-lib/js/utils/helper'
import { awaitPaymentTxConfirmation, fuelAddress, getStaxEndpoints } from 'jolocom-lib-stax-connector/js/utils'
import { HardwareKeyProvider } from 'hardware_key_provider'
import { IdentityWallet } from 'jolocom-lib/js/identityWallet/identityWallet';
import { DidDocument } from 'jolocom-lib/js/identity/didDocument/didDocument';
import { MultiResolver, createValidatingResolver, createJolocomResolver, multiResolver } from 'jolocom-lib/js/resolver';
import { jolocomEthereumResolver } from 'jolocom-lib/js/ethereum/ethereum';
import { jolocomIpfsStorageAgent } from 'jolocom-lib/js/ipfs/ipfs';
import { noValidation } from 'jolocom-lib/js/validation/validation'
import { publicKeyToDID, sha256 } from 'jolocom-lib/js/utils/crypto';


const defaultPass = 'a'.repeat(32)

interface IDParameters {
    idArgs?: { seed: Buffer; password: string }
    dep?: { endpoint: string; contract: string }
    offline: boolean
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

export const isHardwareConnected = (): boolean => {
    try {
        const hkp = new HardwareKeyProvider();
        return hkp ? true : false
    } catch {
        return false
    }
}

const get_vkp = (params?: IDParameters): IVaultedKeyProvider => {
    if (params && params.idArgs) {
        return JolocomLib.KeyProvider.fromSeed(params.idArgs.seed, params.idArgs.password);
    }

    try {
        return new HardwareKeyProvider();
    } catch {
        return JolocomLib.KeyProvider.fromSeed(Buffer.from('a'.repeat(64), 'hex'), defaultPass);
    }
}

const get_backend = (dep?: { endpoint: string, contract: string }): { reg: JolocomRegistry, mRes: MultiResolver } => {
    if (!dep) return { reg: JolocomLib.registries.jolocom.create(), mRes: multiResolver }

    const ethConn = getStaxConfiguredContractsConnector(
        dep.endpoint,
        dep.contract,
        httpAgent
    )

    const ipfsConn = getStaxConfiguredStorageConnector(
        dep.endpoint,
        httpAgent
    )

    const staxRes = createValidatingResolver(createJolocomResolver(ethConn, ipfsConn), noValidation)

    return {
        reg: createJolocomRegistry({
            ethereumConnector: ethConn,
            ipfsConnector: ipfsConn,
            contracts: {
                gateway: getStaxConfiguredContractsGateway(
                    dep.endpoint,
                    777,
                    httpAgent
                ),
                adapter: new ContractsAdapter(777)
            },
            didBuilder: publicKeyToDID('stax')(sha256),
            didResolver: staxRes
        }),
        mRes: new MultiResolver({
            jolo: createValidatingResolver(createJolocomResolver(jolocomEthereumResolver, jolocomIpfsStorageAgent), noValidation),
            stax: staxRes
        })
    }
}

const get_infrastructure = (
    params?: IDParameters
): { vkp: IVaultedKeyProvider; reg: JolocomRegistry; password: string, mRes: MultiResolver } => {
    return {
        vkp: get_vkp(params),
        password: params && params.idArgs
            ? params.idArgs.password
            : defaultPass,
        ...get_backend(params && params.dep)
    }
}

export const create = async (params?: IDParameters) => {
    const { vkp, reg, password } = get_infrastructure(params)
    return reg.create(vkp, password)
}

export const fuel = async (amount: number, params?: IDParameters) => {
    const { vkp, password } = get_infrastructure(params)
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
    const { vkp, reg, password, mRes } = get_infrastructure(params)

    const id = Identity.fromDidDocument({
        didDocument: DidDocument.fromPublicKey(vkp.getPublicKey({
            derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
            encryptionPass: password
        }))
    })
    const idw = params.offline ? new IdentityWallet({
        identity: id,
        vaultedKeyProvider: vkp,
        publicKeyMetadata: {
            derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
            keyId: id.didDocument.publicKey[0].id
        },
        contractsAdapter: reg.contractsAdapter,
        contractsGateway: reg.contractsGateway
    })
        : await reg.authenticate(vkp, {
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
                await idw.validateJWT(resp, req, mRes)
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
