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
  const file = os.tmpdir() + '/jolocom/' + idw.did + '/interactions.json';
  try {
    interactions = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    interactions = {};
  }
  return {
    getDid: (): string => {
      return idw.did;
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
      fs.writeFileSync('interactons.json', JSON.stringify(interactions), 'utf8');
    }
  }
};

export default Controller;
