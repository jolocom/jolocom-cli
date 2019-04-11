import {JolocomLib} from 'jolocom-lib';
import * as fs from 'fs';
import * as os from 'os';

const Controller = async (seed: any, password: string) => {

  const reg = JolocomLib.registries.jolocom.create();
  const vkp = new JolocomLib.KeyProvider(seed, password);
  const idw = await reg.authenticate(vkp, {
    derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
    encryptionPass: password
  })
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
    generateRequest: async (typ, attrs) => {
      try {
        const token = await idw.create.interactionTokens.request[typ](attrs, password);
        interactions[token.nonce] = token;
        return token.encode();
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error;
      }
    },
    generateResponse: async (typ, attrs, recieved?) => {
      try {
        const token = await idw.create.interactionTokens.response[typ](attrs, password, recieved);
        return token.encode();
      } catch (error) {
        return 'Error: Malformed Invokation: ' + error;
      }
    },
    isInteractionResponseValid: async response => {
      const resp = JolocomLib.parse.interactionToken.fromJWT(response);
      const req = interactions[resp.nonce];
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

export default Controller;
