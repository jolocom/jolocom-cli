import * as program from 'commander';
import Controller from './controller';

const init = async (paramlist?: string[]) => {
  if (paramlist && paramlist.length == 2) {
    return await Controller(Buffer.alloc(32, paramlist[0], 'hex'), paramlist[1]);
  }

  return await Controller(Buffer.alloc(32, 'a'.repeat(64), 'hex'), 'secret');
};

program.version('0.1.0')
  .option('-p, --params <seed>,<password>',
          'choose a seed (64 digit hex) and password in list form: seed,password',
          (val: string): string[] => val.split(','));

program.command('did')
  .description('Get basic info (did) for this identity')
  .action(async _ => {
    const id = program.params ? await init(program.params) : await init();
    console.log(id.getDid());
    id.close();
  });

program.command('generate <type> <reqresp> <attrs> [recieved]')
  .description('Generate a request or response JWT of any type with attributes in json form. For a response, the optional recieved param is the request')
  .action(async (type, requestresponse, attrs, recieved?) => {
    const id = program.params ? await init(program.params) : await init();
    switch (requestresponse) {
      case 'request':
        console.log(await id.generateRequest(type, attrs));
        break;
      case 'response':
        console.log(await id.generateResponse(type, attrs, recieved));
        break;
      default:
        console.log('Parameter reqresp MUST be either request or response');
    }
    id.close();
  });

program
  .command('validate <response>')
  .description('Validate a JWT given in response to an interaction request')
  .action(async (response) => {
    const id = program.params ? await init(program.params) : await init();
    console.log(await id.isInteractionResponseValid(response))
    id.close();
  });

program.parse(process.argv);
