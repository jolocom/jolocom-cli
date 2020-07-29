const hasElOfType = (attrs: any, el: string, typ: string): boolean => {
  return attrs && attrs[el] && typeof attrs[el] === typ
}

const optionalElOfType = (attrs: any, el: string, typ: string): boolean => {
  return attrs && (attrs[el] ? typeof attrs[el] === typ : true)
}

const hasCallback = (attrs: any): boolean => {
  return hasElOfType(attrs, 'callbackURL', 'string')
}

const isAuth = (attrs: any) => {
  return hasCallback(attrs) && optionalElOfType(attrs, 'description', 'string')
}

const isCredShareReq = (attrs: any) => {
  return hasCallback(attrs) && hasElOfType(attrs, 'credentialRequirements', 'object')
}

const isCredShareResp = (attrs: any) => {
  return hasCallback(attrs) && hasElOfType(attrs, 'suppliedCredentials', 'object')
}

const isCredOfferReq = (attrs: any) => {
  return (
    hasCallback(attrs) && hasElOfType(attrs, 'instant', 'boolean') && hasElOfType(attrs, 'requestedInput', 'object')
  )
}

const isCredOfferResp = (attrs: any) => {
  return hasElOfType(attrs, 'signedCredentials', 'object')
}

const isPaymentReq = (attrs: any) => {
  return (
    hasCallback(attrs) &&
    hasElOfType(attrs, 'description', 'string') &&
    hasElOfType(attrs, 'transactionOptions', 'object') &&
    hasElOfType(attrs.transactionOptions, 'value', 'number')
  )
}

const isPaymentResp = (attrs: any) => {
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
