# jolocom-cli
Jolocom-cli is a cli tool to interact with a jolocom self-sovereign identity.

## Installation:
Simply run `npm install -g jolocom-cli`

## Usage
Usage information can be found with the -h flag.

Example usage:
- get the did of the local identity:
`jolocom-cli did`

- get the did of an identity created with seed x and password y (the seed should be a 64 digit hex integer):
`jolocom-cli did -p x,y`

- generate an authentication request with callback URL http://www.google.com:
`jolocom-cli generate authentication "{\\"callbackURL\\": \\"http://www.google.com\\"}" -p x,y`

- validate a response to the previous authentication request:
`jolocom-cli validate <JWT> -p x,y`

## Notes
- The generated requests are JWT encoded and signed.
- Likewise, the validate command also expects an encoded and signed JWT as input.
- The seed and password options are not required, however without them the tool will default to a single identity for every user.
- In future, the tool will detect the presence of a secure hardware element to gather entropy from, making the default identity different for each machine.
