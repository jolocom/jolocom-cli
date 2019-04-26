## Intro:  


Jolocom-cli is a simple tool for interacting with the Jolocom identity infrastructure from the command line. Please note that currently only a subset of the APIs exposed by the Jolocom Library are supporter. 

The following sections will show how to use the provided tool to anchor a new identity and issue authentication / payment requests. We will also look at a quick example of broadcasting the generated requests to the SmartWallet using deep linking.

## Setting up the CLI:

First, install the CLI tool, either locally or globally:

    npm install -g jolocom-cli

At this point you can already start using it as described in the next sections. For all request signatures a default identity will be used (not recommended for production obviously, but will work for testing). In case you want to create a custom identity you need to provide a custom 32 byte hex encoded seed using the **-i** flag, for example:

    jolocom-cli <command> -i "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

If you actually try to run a command, you'll most likely get the following error:  


> current identity is not anchored

This is because the identity was not yet registered on the ledger. To register it, first fuel the key with some Ether to pay for the transaction:

    jolocom-cli fuel -i "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

And after the key has been fueled, anchor it:

    jolocom-cli create -i "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

At this point you can test if it was anchored correctly using:

    jolocom-cli did -i "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    did: did:jolo:6b8e4245e9863a976b475b7a7c1dc70e290c9fbf0de9eec751d821944658b564
    created: 2019-04-22T10:09:28.863Z

---


# Creating interaction requests:

## Authentication:

The route for authentication is:

    jolocomwallet://authenticate/<JWT>

We can generate an authentication request for testing using  the CLI tool:

    jolocom-cli request auth "https://callback.com"

In the example above, a JWT is created with the specified callback url. The JWT is signed by the staX identity. In order to resolve the staX identity we provide the deployment info (the endpoint of the staX deployment + identity contract address) using the **-s** flag.

This JWT can be sent to the device on the previously mentioned route, for example by using:

    adb shell am start -a android.intent.action.VIEW -d jolocomwallet://authenticate/<JWT>

Further info about the accepted options is available if you run

    jolocom-cli request auth --help

    #Output:

    Usage: jolocom-cli request auth <callbackURL> [description] [options...]

    Positionals:
      callbackURL  - url to which the client should send the response        [string] [required]
      description  - additional description to render on the client device   [string]

    Options:
      --help          Show help  [boolean]
      --version       Show version number  [boolean]
      --staX, -s      Use custom staX deployment instead of public registry  [string]
      --identity, -i  Provide custom 32 byte seed to generate identity keys  [string]

As you can see, you can also pass an optional **description** that will be rendered on the SmartWallet, the **default text is "Authorize the transaction"**.

In case you want to use a custom identity, you can specify it using the optional **-i** flag, for example:

    jolocom-cli ... -i "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

32 hex encoded bytes for the seed are expected. If the **-i** flag is not present, **the default seed of **`aaa....aaa`** will be used. Please note that the custom identity has to be registered first as described in the first section.**

## Payment:

Please note that payment related interactions are **experimental** and are only to be used for **testing purposes**.

The route for payment is 

    jolocomwallet://payment/<JWT>

We can generate a payment request for testing using  the CLI tool:

    jolocom-cli request payment "https://c3378b68.ngrok.io" "Description of provided service" "0.5"

In the example above, a JWT is created with the specified callback url, description, and amount (**0.5 Eth** in this case). T

For usage info you can again run:

    jolocom-cli request payment --help
    
    #Relevant output:
    
    Positionals:
      callbackURL  - url to which the client will send the response                  [string] [required]
      description  - additional description to render on the client device           [string] [required]
      amount       - amount of Eth to transfer                                       [number] [required]
      to           - receiver Ethereum address, defaults to current identity                    [string]

Just like in the previous example, the **-i** flag can be used to specify a custom identity, although for testing the default one should do.
