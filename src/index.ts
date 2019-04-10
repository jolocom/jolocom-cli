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

program.command('generate <type> <args>')
  .description('Generate a request JWT of any type with args in json form')
  .action(async (type, args) => {
    const id = await init();
    switch (type) {
      case 'payment':
        console.log(await id.getPaymentRequest(JSON.parse(args)));
        break;
      case 'authentication':
        console.log(await id.getAuthenticationRequest(JSON.parse(args)));
        break;
      default:
        console.log('request type not supported');
    }
    id.close();
  });

program
  .command('validate <response>')
  .description('Validate a JWT given in response to an interaction request')
  .action(async (response) => {
    const id = await init();
    console.log(await id.isInteractionResponseValid(response))
    id.close();
  });

program.parse(process.argv);
