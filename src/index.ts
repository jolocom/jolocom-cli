import * as program from "commander"
import { Controller, fuel, create } from "./controller"

const readSeedAndParse = (
  input: string
): { seed: Buffer; password: string } => {
  const vlist = input.split(",")
  return { seed: Buffer.from(vlist[0], "hex"), password: vlist[1] }
}

const readDepAndParse = (
  input: string
): { endpoint: string; contract: string } => {
  const vlist = input.split(",")
  return { endpoint: vlist[0], contract: vlist[1] }
}

program
  .version("0.1.0")
  .option(
    "-i, --identity <seed>,<password>",
    "choose an identity corrosponding to the seed (64 digit hex) and password in list form: seed,password",
    readSeedAndParse
  )
  .option(
    "-s, --stax <endpoint>,<contract>",
    "use a Telekom STAX deployment in place of Ethereum and IPFS, with an endpoint and a contract address",
    readDepAndParse
  )

program
  .command("did")
  .description("Get basic info (did) for this identity")
  .action(async _ => {
    const id = await Controller({ idArgs: program.identity, dep: program.stax })
    console.log(id.getDid())
  })

program
  .command("create")
  .description("Creates an identity. If already existant, this fails silently.")
  .action(async _ => {
    await create({ idArgs: program.identity, dep: program.stax })
  })

program
  .command("fuel")
  .description(
    "Fuels an identity with some Eth. Will be deprecated upon main net."
  )
  .action(async _ => {
    await fuel({ idArgs: program.identity, dep: program.stax })
  })

program
  .command("clear")
  .description(
    "Clears the stored history of generated request tokens which are used for response validation."
  )
  .action(async _ => {
    const id = await Controller({ idArgs: program.identity, dep: program.stax })
    id.clearInteractions()
    id.close()
  })

program
  .command("generate <type> <reqresp> <attrs> [recieved]")
  .description(
    "Generate a request or response JWT of any type with attributes in json form. For a response, the optional recieved param is the request"
  )
  .action(async (type, requestresponse, attrs_string, recieved?) => {
    const id = await Controller({ idArgs: program.identity, dep: program.stax })
    const attrs = JSON.parse(attrs_string)
    switch (requestresponse) {
      case "request":
        console.log(await id.generateRequest(type, attrs))
        break
      case "response":
        console.log(await id.generateResponse(type, attrs, recieved))
        break
      default:
        console.log("Parameter reqresp MUST be either request or response")
    }
    id.close()
  })

program
  .command("validate <response>")
  .description("Validate a JWT given in response to an interaction request")
  .action(async response => {
    const id = await Controller({ idArgs: program.identity, dep: program.stax })
    const resp = await id.isInteractionResponseValid(response)
    console.log("valid: " + resp.validity)
    console.log("did: " + resp.responder)
    id.close()
  })

program.parse(process.argv)
