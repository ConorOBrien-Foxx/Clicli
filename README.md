# Clicli

## Client-side encryption for multiple keyholders

Objective: Deliver a static HTML/JS/CSS page whose contents are to be hidden except from privileged parties, accessible to privileged users via predetermined passwords.

(Name origin: Client-Crypt &rarr; Cli-Cry &rarr; Cli-Cly &rarr; Clicli)

## Usage

### Encryption

Use the node.js command line application (same as the browser import):

```
node clicli.js source.html password1 [password2 [... passwordN]]
```

For example:

```C:\Users\conor\Programming\Clicli
λ cat secret.html
<h1>Hello, World!</h1>
<p>A world of secrecy awaits you.</p>

C:\Users\conor\Programming\Clicli
λ node clicli.js secret.html "my first password" "hello"
<encrypted>
    0c3f618b26b61ec69c7a5534bcff6fffd05a577e320508a618d602a527fad67180ec7d807ebef67d6ae348c20778304c4d14ee647429f274e73d56c110234eaeb8f0c760cad7fa1b7170053f22:0e7bd77cb90640b8cf3a78d4efc72b5ec433e86df2e4e3b117a9bd952de5edd060ba35939217a3b6a8f6a4950df5d22b363f3ca0237373b3e0bfe085413e74e63db686eef906db4db3741b5a57
</encrypted>
```

### Decryption/Deployment

Simply include the generated `<encrypted>` element and a script tag pointing to the included `clicli.js`. You can set a global config by including the following script tag before including `clicli.js`. These are the default values CliCli uses.

```
<script>
    window.CliCliConfig = {
        useLocalStorage: true,
        sentinel: "CLICLI",
        joiner: ":"
    };
</script>
<script src="clicli.js"></script>
```

### Advanced Usage

[todo]