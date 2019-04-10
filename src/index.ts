import * as program from 'commander';
import Controller from './controller';

const init = async (seed: any, password: string) => {
  return await Controller(seed, password);
}

const seed = Buffer.alloc(32, 'a'.repeat(64));
const pass = 'secret';

program.version('0.1.0')
  .option('-s, --seed <seed>', 'choose a seed')
  .option('-p, --password <password>', 'choose a password');

program.command('did')
  .description('Get basic info (did) for this identity')
  .action(async _ => {
    const id = await init(seed, pass);
    console.log(id.getDid());
  });

program.command('generate [type] [args]')
  .description('Generate a request JWT of any type (defaults to authentication)')
  .action(async (type, args) => {
    const id = await init(seed, pass);
    switch (type) {
      case 'payment':
        console.log(await id.getPaymentRequest(args));
        break;
      default:
        console.log(await id.getAuthenticationRequest(args));
        break;
    }
  });

program
  .command('validate <response>')
  .description('Validate a JWT given in response to an interaction request')
  .action(async (response) => {
    const id = await init(seed, pass);
    console.log(await id.isInteractionResponseValid(response))
  });

program.parse(process.argv);
