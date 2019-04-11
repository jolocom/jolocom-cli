import {JolocomLib} from 'jolocom-lib';
import { AuthRequestCreationArgs,
         CredentialShareRequestCreationArgs,
         CredentialShareResponseCreationArgs,
         CredentialOfferRequestCreationArgs,
         PaymentRequestCreationArgs,
         CredentialOfferResponseCreationArgs,
         PaymentResponseCreationArgs } from 'jolocom-lib/js/identityWallet/types';

const isAuth = (attrs: any): attrs is AuthRequestCreationArgs => {
  return attrs && attrs.callbackURL && typeof(attrs.callbackURL) == 'string';
}

const isCredShareReq = (attrs: any): attrs is CredentialShareRequestCreationArgs => {
  return false;
}

const isCredShareResp = (attrs: any): attrs is CredentialShareResponseCreationArgs => {
  return false;
}

const isCredOfferReq = (attrs: any): attrs is CredentialOfferRequestCreationArgs => {
  return false;
}

const isCredOfferResp = (attrs: any): attrs is CredentialOfferResponseCreationArgs => {
  return false;
}

const isPaymentReq = (attrs: any): attrs is PaymentRequestCreationArgs => {
  return false;
}

const isPaymentResp = (attrs: any): attrs is PaymentResponseCreationArgs => {
  return false;
}

export default {request: {auth: isAuth,
                          share: isCredShareReq,
                          offer: isCredOfferReq,
                          payment: isPaymentReq},
                response: {auth: isAuth,
                           share: isCredShareResp,
                           offer: isCredOfferResp,
                           payment: isPaymentResp}};
