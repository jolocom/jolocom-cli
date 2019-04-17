# jolocom-cli
Jolocom-cli is a cli tool to interact with a jolocom self-sovereign identity.

## Installation:
Simply run `npm install -g jolocom-cli`

Alternatively, for a local installation, run `npm run prepare` to transpile and then `node cli.js` in place of `jolocom-cli` for any command.

## Usage
Usage information can be found with the -h flag.

Example usage:
- get the did of the local identity:
`jolocom-cli did`

- get the did of an identity created with seed b and password b (the seed should be a 64 digit hex integer):
`jolocom-cli did -i a,b`

- register/anchor a did
`jolocom-cli create -i a, b`

- generate an authentication request with callback URL http://www.google.com using identity a,b:
`jolocom-cli generate auth request "{\"callbackURL\": \"http://www.google.com\"}" -i a,b`

- generate an authentication response to the above request with identity c,d:
`jolocom-cli generate auth response "{\"callbackURL\": \"http://www.google.com\"}" {requestJWT} -i c,d`

- validate the authentication response generated above with a,b:
`jolocom-cli validate <JWT> -i a,b`

- use custom [STAX](https://laboratories.telekom.com/blockchain/) deployment with endpoint and registry contract address:
`jolocom-cli {command} -s "https://example.endpoint.com",0xyourcontractaddr`

## Interaction Types and Attributes
The interaction types consist of:
- auth: Authentication
- offer: Credential Offer
- share: Credential Share
- payment: Payment

The Attributes these types require are all in JSON form and are specified in their [typings file](https://github.com/jolocom/jolocom-lib/blob/master/ts/interactionTokens/interactionTokens.types.ts)

## Full API
```
jolocom-cli -h
Usage: jolocom-cli [options] [command]

Options:
  -V, --version                                 output the version number
  -i, --identity <seed>,<password>              choose an identity corrosponding to the seed (64 digit hex) and password in list form: seed,password
  -s, --stax <endpoint>,<contract>              use a Telekom STAX deployment in place of Ethereum and IPFS, with an endpoint and a contract address
  -h, --help                                    output usage information

Commands:
  did                                           Get basic info (did) for this identity
  create                                        Creates an identity. If already existant, this fails silently.
  fuel                                          Fuels an identity with some Eth. Will be deprecated upon main net.
  clear                                         Clears the stored history of generated request tokens which are used for response validation.
  generate <type> <reqresp> <attrs> [recieved]  Generate a request or response JWT of any type with attributes in json form. For a response, the optional recieved param is the request
  validate <response>                           Validate a JWT given in response to an interaction request
  ```

## Notes
- The generated requests are JWT encoded and signed.
- Likewise, the validate command also expects an encoded and signed JWT as input.
- The seed and password options are not required, however without them the tool will default to a single identity for every user.
- In future, the tool will detect the presence of a secure hardware element to gather entropy from, making the default identity different for each machine.
- Support for (signed) credential creation is planned for a future release
