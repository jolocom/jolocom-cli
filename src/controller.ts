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
    generate: async (typ, reqresp, attrs) => {
      try {
        const token = await idw.create.interactionTokens[reqresp][typ](attrs);
        if (reqresp === 'request') {
          interactions[token.nonce];
        }
        return token.encode();
      } catch {
        return 'Error: malformed invokation'
      }
    },

    getAuthenticationRequest: async (callback_url: string) => {
      const req = await idw.create.interactionTokens.request.auth({callbackURL: callback_url}, password);
      interactions[req.nonce] = req;
      return req.encode();
    },
    getPaymentRequest: async (payment_details) => {
      const req = await idw.create.interactionTokens.request.payment(payment_details, password);
      interactions[req.nonce] = req;
      return req.encode();
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
