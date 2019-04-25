import {
  CredentialShareRequestCreationArgs,
  CredentialShareResponseCreationArgs,
  CredentialOfferRequestCreationArgs,
  PaymentRequestCreationArgs,
  CredentialOfferResponseCreationArgs,
  PaymentResponseCreationArgs,
  AuthCreationArgs
} from 'jolocom-lib/js/identityWallet/types'

const hasElOfType = (attrs: any, el: string, typ: string): boolean => {
  return attrs && attrs[el] && typeof attrs[el] === typ
}

const optionalElOfType = (attrs: any, el: string, typ: string): boolean => {
  return attrs && (attrs[el] ? typeof attrs[el] === typ : true)
}

const hasCallback = (attrs: any): boolean => {
  return hasElOfType(attrs, 'callbackURL', 'string')
}

const isAuth = (attrs: any): attrs is AuthCreationArgs => {
  return hasCallback(attrs) && optionalElOfType(attrs, 'description', 'string')
}

const isCredShareReq = (attrs: any): attrs is CredentialShareRequestCreationArgs => {
  return hasCallback(attrs) && hasElOfType(attrs, 'credentialRequirements', 'object')
}

const isCredShareResp = (attrs: any): attrs is CredentialShareResponseCreationArgs => {
  return hasCallback(attrs) && hasElOfType(attrs, 'suppliedCredentials', 'object')
}

const isCredOfferReq = (attrs: any): attrs is CredentialOfferRequestCreationArgs => {
  return (
    hasCallback(attrs) && hasElOfType(attrs, 'instant', 'boolean') && hasElOfType(attrs, 'requestedInput', 'object')
  )
}

const isCredOfferResp = (attrs: any): attrs is CredentialOfferResponseCreationArgs => {
  return hasElOfType(attrs, 'signedCredentials', 'object')
}

const isPaymentReq = (attrs: any): attrs is PaymentRequestCreationArgs => {
  return (
    hasCallback(attrs) &&
    hasElOfType(attrs, 'description', 'string') &&
    hasElOfType(attrs, 'transactionOptions', 'object') &&
    hasElOfType(attrs.transactionOptions, 'value', 'number')
  )
}

const isPaymentResp = (attrs: any): attrs is PaymentResponseCreationArgs => {
  return hasElOfType(attrs, 'txHash', 'string')
}

export default {
  request: {
    auth: isAuth,
    share: isCredShareReq,
    offer: isCredOfferReq,
    payment: isPaymentReq
  },
  response: {
    auth: isAuth,
    share: isCredShareResp,
    offer: isCredOfferResp,
    payment: isPaymentResp
  }
}
