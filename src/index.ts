import { Controller, create, fuel } from './controller'
import { JolocomLib } from 'jolocom-lib'
import { CredentialRequest } from 'jolocom-lib/js/interactionTokens/credentialRequest'
import { AuthCreationArgs, PaymentRequestCreationArgs } from 'jolocom-lib/js/identityWallet/types'
import * as yargs from 'yargs'

const ethToWei = n => n * 1e18

require('yargs')
  .scriptName('jolocom-cli')
  .wrap(yargs.terminalWidth())

  .command(
    'did',
    'get basic info about current identity',
    yargs => {
      yargs.usage('Usage: $0 did [options...]')
    },
    args =>
      Controller({ idArgs: args.identity, dep: args.staX, offline: args.offline })
        .then(id => {
          const { did, created } = id.getDidInfo()
          console.log(`did: ${did}`)
          console.log(`created: ${created.toISOString()}`)
        })
        .catch(err => {
          console.log('current identity is not anchored')
        })
  )

  .command(
    'fuel [amount]',
    'fuels current identity with Eth',
    yargs => {
      yargs.usage('Usage: $0 fuel [amount] [options...]')
      yargs.positional('amount', {
        describe: '- amount of Eth to request',
        type: 'number',
        coerce: ethToWei,
        default: 10
      })
    },
    args => fuel(args.amount, { idArgs: args.identity, dep: args.staX, offline: false })
  )

  .command(
    'create',
    'registers a new identity on the ledger',
    yargs => {
      yargs.usage('Usage: $0 create [options...]')
    },
    args => create({ idArgs: args.identity, dep: args.staX, offline: false })
  )

  .command(
    'clear',
    'clears the local history of generated request tokens used for response validation',
    yargs => {
      yargs.usage('Usage: $0 clear')
    },
    args =>
      Controller({ idArgs: args.identity, dep: args.staX, offline: true })
        .then(id => {
          id.clearInteractions()
          id.close()
        })
        .catch(err => {
          console.log('current identity is not anchored')
        })
  )

  .command(
    'validate <response>',
    'validate a response JWT',
    yargs => {
      yargs.usage('Usage: $0 validate <JWT> [options...]')
      yargs.positional('response', {
        description: '- JWT encoded response received from the client',
        type: 'string'
      })
    },
    args =>
      Controller({ idArgs: args.identity, dep: args.staX, offline: false })
        .then(async id => {
          const { validity, responder } = await id.isInteractionResponseValid(args.response)
          console.log('valid:', validity)
          console.log('did:', responder)
          id.close()
        })
        .catch(err => {
          console.log('current identity is not anchored')
        })
  )

  .command(
    'keycloak <credentialRequest>',
    'generate valid credential response for KeyCloak integration',
    yargs => {
      yargs.usage('Usage: $0 keycloak <JWT> [options...]')
      yargs.positional('credentialRequest', {
        description: '- JWT encoded credential request received from the backend',
        type: 'string'
      })
      yargs
        .option('name', {
          alias: 'n',
          description: "Value of the 'Name' credential",
          default: 'Scooter'
        })
        .option('email', {
          alias: 'e',
          description: "Value of the 'Email' credential",
          default: 'scooter@dflow.demo'
        })
    },
    ({ name, email, credentialRequest, identity, staX, offline }) =>
      Controller({
        idArgs: identity,
        dep: staX,
        offline: offline
      })
        .then(async id => {
          const { nameCred, emailCred } = await id.createKeyCloakCredentials(name, email)
          const {
            interactionToken: { callbackURL }
          } = JolocomLib.parse.interactionToken.fromJWT<CredentialRequest>(credentialRequest)

          const credentialResponse = await id.generateResponse(
            'share',
            {
              callbackURL: callbackURL,
              suppliedCredentials: [nameCred, emailCred]
            },
            credentialRequest
          )
          console.log(credentialResponse)
          id.clearInteractions()
          id.close()
        })
        .catch(err => {
          console.log('current identity is not anchored')
        })
  )

  .command(
    'request',
    'generate a JWT encoded interaction request',
    yargs => {
      yargs.command(
        'auth <callbackURL> [description]',
        'generate JWT encoded authentication request',
        yargs => {
          yargs.usage('Usage: $0 request auth <callbackURL> [description] [options...]')
          yargs.positional('callbackURL', {
            description: '- url to which the client should send the response',
            type: 'string'
          })

          yargs.positional('description', {
            description: '- additional description to render on the client device',
            type: 'string'
          })
        },
        args =>
          Controller({ idArgs: args.identity, dep: args.staX, offline: args.offline })
            .then(async id => {
              const attrs: AuthCreationArgs = {
                callbackURL: args.callbackURL
              }

              if (args.description) attrs.description = args.description

              console.log(await id.generateRequest('auth', attrs))
              id.close()
            })
            .catch(err => {
              console.log('current identity is not anchored')
            })
      )
      yargs.command(
        'payment <callbackURL> <description> <amount> [to]',
        'generate JWT encoded payment request',
        yargs => {
          yargs.usage('Usage: $0 request payment <callbackURL> <description> <amount> [to] [options...]')
          yargs.positional('callbackURL', {
            description: '- url to which the client will send the response',
            type: 'string'
          })
          yargs.positional('description', {
            description: '- additional description to render on the client device',
            type: 'string'
          })
          yargs.positional('amount', {
            description: '- amount of Eth to transfer',
            coerce: ethToWei,
            type: 'number'
          })
          yargs.positional('to', {
            description: '- receiver Ethereum address, defaults to current identity',
            type: 'string'
          })
        },
        args =>
          Controller({ idArgs: args.identity, dep: args.staX, offline: args.offline })
            .then(async id => {
              const attrs: PaymentRequestCreationArgs = {
                callbackURL: args.callbackURL,
                description: args.description,
                transactionOptions: {
                  value: args.amount
                }
              }

              if (args.to) attrs.transactionOptions.to = args.to

              console.log(await id.generateRequest('payment', attrs))
              id.close()
            })
            .catch(err => {
              console.log('current identity is not anchored')
            })
      )
    },
    () => {}
  )

  .command(
    'response',
    'generate a JWT encoded interaction response',
    yargs => {
      yargs.command(
        'auth <request> <callbackURL> [description]',
        'generate a JWT auth response to the request',
        yargs => {
          yargs.usage('Usage: $0 response auth <request> <callbackURL> [description] [options...]')
          yargs.positional('request', {
            description: '- auth request to respond to',
            type: 'string'
          })

          yargs.positional('callbackURL', {
            description: '- url to which the client should send the response',
            type: 'string'
          })

          yargs.positional('description', {
            description: '- additional description to render on the client device',
            type: 'string'
          })
        },
        args =>
          Controller({ idArgs: args.identity, dep: args.staX, offline: args.offline })
            .then(async id => {
              const attrs: AuthCreationArgs = {
                callbackURL: args.callbackURL
              }

              if (args.description) attrs.description = args.description

              console.log(await id.generateResponse('auth', attrs, args.request))
                id.close()
              })
              .catch(err => {
                console.log('current identity is not anchored')
              })
      )
    },
    () => {}
  )

  .option('staX', {
    alias: 's',
    description: 'Use custom staX deployment instead of public registry',
    nargs: 2,
    coerce: ([endpoint, contract]) => ({ endpoint, contract }),
    type: 'string'
  })

  .option('identity', {
    alias: 'i',
    description: 'Provide custom 32 byte seed to generate identity keys',
    type: 'string',
    coerce: seed => ({ seed: Buffer.from(seed, 'hex'), password: 'secret' })
  })

  .option('offline', {
    alias: 'o',
    description: 'Run without network requests. Does not apply to fuel, create or validate',
    type: 'boolean'
  }).argv

