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
`jolocom-cli did -p a,b`

- generate an authentication request with callback URL http://www.google.com using identity a,b:
`jolocom-cli generate auth request "{\"callbackURL\": \"http://www.google.com\"}" -p a,b`

- generate an authentication response to the above request with identity c,d:
`jolocom-cli generate auth response "{\"callbackURL\": \"http://www.google.com\"}" {requestJWT} -p c,d`

- validate the authentication response generated above with a,b:
`jolocom-cli validate <JWT> -p a,b`

- use custom [STAX](https://laboratories.telekom.com/blockchain/) deployment with endpoint and registry contract address:
`jolocom-cli {command} -s "https://r2bapi.dltstax.net",0x32dacb62d2fe618697f192cda3abc50426e5486c

## Interaction Types and Attributes
The interaction types consist of:
- auth: Authentication
- offer: Credential Offer
- share: Credential Share
- payment: Payment

The Attributes these types require are all in JSON form and are specified in their [typings file](https://github.com/jolocom/jolocom-lib/blob/master/ts/interactionTokens/interactionTokens.types.ts)

## Notes
- The generated requests are JWT encoded and signed.
- Likewise, the validate command also expects an encoded and signed JWT as input.
- The seed and password options are not required, however without them the tool will default to a single identity for every user.
- In future, the tool will detect the presence of a secure hardware element to gather entropy from, making the default identity different for each machine.
- Support for (signed) credential creation is planned for a future release
