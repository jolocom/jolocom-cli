import {JolocomLib} from 'jolocom-lib';
import {getStaxConfiguredContractsConnector,
        getStaxConfiguredStorageConnector,
        getStaxConfiguredContractsGateway} from 'jolocom-lib-stax-connector'
import * as fs from 'fs';
import axios from 'axios';
import attrCheck from './validation';
import { createJolocomRegistry } from 'jolocom-lib/js/registries/jolocomRegistry';
import { ContractsAdapter } from 'jolocom-lib/js/contracts/contractsAdapter';

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

const Controller = async (params?: {idArgs?: {seed: any, password: string}, endpoint?: string}) => {
  const idArgs = (params && params.idArgs) || {seed: Buffer.from('a'.repeat(64), 'hex'), password: 'secret'};
  const reg = params.endpoint ? createJolocomRegistry({
    ethereumConnector: getStaxConfiguredContractsConnector(
      params.endpoint,
      '0x32dacb62d2fe618697f192cda3abc50426e5486c',
      httpAgent,
    ),
    ipfsConnector: getStaxConfiguredStorageConnector(
      params.endpoint,
      httpAgent,
    ),
    contracts: {
      gateway: getStaxConfiguredContractsGateway(
        params.endpoint,
        777,
        httpAgent,
      ),
      adapter: new ContractsAdapter(777),
    },
  }) : JolocomLib.registries.jolocom.create();

  const vkp = new JolocomLib.KeyProvider(idArgs.seed, idArgs.password);
  const idw = await reg.authenticate(vkp, {
    derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
    encryptionPass: idArgs.password
  })
  var interactions: {};
  const dir = __dirname + '/interactions/' + idw.did.slice(10, 30);
  try {
    interactions = JSON.parse(fs.readFileSync(dir + '/interactions.json', 'utf8'));
  } catch {
    interactions = {};
  }

  const tokens = idw.create.interactionTokens;

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
        const token = await tokens.request[typ](attrs, idArgs.password);
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
        const token = await tokens.response[typ](attrs, idArgs.password, JolocomLib.parse.interactionToken.fromJWT(recieved));
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
    fuel: async () => {
      await JolocomLib.util.fuelKeyWithEther(vkp.getPublicKey({derivationPath: JolocomLib.KeyTypes.ethereumKey,
                                                               encryptionPass: idArgs.password}));
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

export default Controller;
