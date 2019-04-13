import {JolocomLib} from 'jolocom-lib';
import {getStaxConfiguredContractsConnector,
        getStaxConfiguredStorageConnector,
        getStaxConfiguredContractsGateway} from 'jolocom-lib-stax-connector'
import * as fs from 'fs';
import axios from 'axios';
import attrCheck from './validation';
import { createJolocomRegistry } from 'jolocom-lib/js/registries/jolocomRegistry';
import { ContractsAdapter } from 'jolocom-lib/js/contracts/contractsAdapter';
import { IVaultedKeyProvider } from 'jolocom-lib/js/vaultedKeyProvider/types';
import { IRegistry } from 'jolocom-lib/js/registries/types';

interface IDParameters {
  idArgs?: {seed: Buffer,
            password: string},
  dep?: {endpoint: string,
         contract: string}
}

const httpAgent = {
  getRequest: endpoint => {
    return axios.get(endpoint).then(res => res.data);
  },

  postRequest: (endpoint, headers, data) => {
    return axios.post(endpoint, data, { headers }).then(res => res.data);
  },

  headRequest: endpoint => {
    return axios.head(endpoint)
      .then(res => res)
      .catch(err => err);
  }
};


const get_infrastructure = async (params?: IDParameters): Promise<{vkp: IVaultedKeyProvider,
                                                                   reg: IRegistry,
                                                                   password: string}> => {
  const idArgs = (params && params.idArgs) || {seed: Buffer.from('a'.repeat(64), 'hex'), password: 'secret'};

  return {vkp: new JolocomLib.KeyProvider(idArgs.seed, idArgs.password),
          reg: params.dep ? createJolocomRegistry({
            ethereumConnector: getStaxConfiguredContractsConnector(
              params.dep.endpoint,
              params.dep.contract || '0x32dacb62d2fe618697f192cda3abc50426e5486c',
              httpAgent,
            ),
            ipfsConnector: getStaxConfiguredStorageConnector(
              params.dep.endpoint,
              httpAgent,
            ),
            contracts: {
              gateway: getStaxConfiguredContractsGateway(
                params.dep.endpoint,
                777,
                httpAgent,
              ),
              adapter: new ContractsAdapter(777),
            },
          }) : JolocomLib.registries.jolocom.create(),
          password: idArgs.password};
}

export const create = async (params?: IDParameters) => {
  const {vkp, reg, password} = await get_infrastructure(params);

  reg.create(vkp, password);
}

export const fuel = async (params?: IDParameters) => {
  const {vkp, reg, password} = await get_infrastructure(params);

  JolocomLib.util.fuelKeyWithEther(vkp.getPublicKey({
    derivationPath: JolocomLib.KeyTypes.ethereumKey,
    encryptionPass: password
  }));
}

export const Controller = async (params?: IDParameters) => {
  const {vkp, reg, password} = await get_infrastructure(params);

  const idw = await reg.authenticate(vkp, {
    derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
    encryptionPass: password
  })
  const tokens = idw.create.interactionTokens;

  var interactions: {};
  const dir = __dirname + '/interactions/' + idw.did.slice(10, 30);
  try {
    interactions = JSON.parse(fs.readFileSync(dir + '/interactions.json', 'utf8'));
  } catch {
    interactions = {};
  }

  return {
    getDid: (): string => {
      return idw.did;
    },
    clearInteractions: (): void => {
      interactions = {};
    },
    generateRequest: async (typ: string, attrs: any): Promise<string> => {
      if (!attrCheck.request[typ](attrs)) {
        return 'Error: Incorrect token attribute form for interaction type ' + typ + ' request';
      }
      try {
        const token = await tokens.request[typ](attrs, password);
        interactions[token.nonce] = token;
        return token.encode();
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error;
      }
    },
    generateResponse: async (typ: string, attrs: any, recieved?: string): Promise<string> => {
      if (!attrCheck.response[typ](attrs)) {
        return 'Error: Incorrect token attribute form for interaction type ' + typ + ' response';
      }
      try {
        const token = await tokens.response[typ](attrs,
                                                 password,
                                                 JolocomLib.parse.interactionToken.fromJWT(recieved));
        return token.encode();
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error;
      }
    },
    isInteractionResponseValid: async (response: string): Promise<boolean> => {
      const resp = JolocomLib.parse.interactionToken.fromJWT(response);
      const req = JolocomLib.parse.interactionToken.fromJSON(interactions[resp.nonce]);
      try {
        await idw.validateJWT(resp, req);
        delete interactions[resp.nonce];
        return true;
      } catch (err) {
        return false;
      }
    },
    close: () => {
      try {
        fs.writeFileSync(dir + '/interactions.json', JSON.stringify(interactions), 'utf8');
      } catch {
        fs.mkdirSync(dir, {recursive: true});
        fs.writeFileSync(dir + '/interactions.json', JSON.stringify(interactions), 'utf8');
      }
    }
  }
};
