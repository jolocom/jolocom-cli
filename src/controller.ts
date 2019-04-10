import {JolocomLib} from 'jolocom-lib';

const Controller = async (seed: any, password: string) => {

  const reg = JolocomLib.registries.jolocom.create();
  const vkp = new JolocomLib.KeyProvider(seed, password);
  const idw = await reg.authenticate(vkp, {
    derivationPath: JolocomLib.KeyTypes.jolocomIdentityKey,
    encryptionPass: password
  })
  const interactions = new Map();

  return {
    getDid: (): string => {
      return idw.did;
    },
    getAuthenticationRequest: async (callback_url: string) => {
      const req = await idw.create.interactionTokens.request.auth({callbackURL: callback_url}, password);
      interactions.set(req.nonce, req);
      return req.encode();
    },
    getPaymentRequest: async (payment_details) => {
      const req = await idw.create.interactionTokens.request.payment(payment_details, password);
      interactions.set(req.nonce, req);
      return req.encode();
    },
    isInteractionResponseValid: async response => {
      const resp = JolocomLib.parse.interactionToken.fromJWT(response);
      const req = interactions.get(resp.nonce);
      try {
        await idw.validateJWT(resp, req);
        interactions.delete(resp.nonce);
        return true;
      } catch (err) {
        return false;
      }
    }
  }
};

export default Controller;
