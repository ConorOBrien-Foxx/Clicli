class GroupEncryption {
    constructor(config={}) {
        this.config = Object.assign({}, {
            sentinel: "CLICLI",
            joiner: ":"
        }, config);
        // joiner cannot appear in the metadata, but it can appear in the content
    }
    
    get joiner() {
        return this.config.joiner;
    }
    get sentinel() {
        return this.config.sentinel;
    }
    get useLocalStorage() {
        return this.config.useLocalStorage;
    }
    
    static async plaintextPasswordToKeyBuffer(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await GroupEncryption.crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return Uint8Array.from(hashArray);
    };
    
    encodePassword(pw) {
        return GroupEncryption.plaintextPasswordToKeyBuffer(pw).then(keyBuffer => 
            GroupEncryption.crypto.subtle.importKey(
                "raw",
                keyBuffer.buffer,
                "AES-CTR",
                false,
                ["encrypt", "decrypt"],
            )
        );
    }
    
    async encode(content, passwords) {
        const encoder = new TextEncoder();
        
        // sentinel for decode detection
        content = `${this.sentinel}size=${content.length}${this.joiner}${content}`;
        
        let groupText = "";
        
        const dataBuffer = encoder.encode(content);
        console.log("databuf:", dataBuffer);
        for(let pw of passwords) {
            let keyEncoded = await this.encodePassword(pw);
            const encrypted = await GroupEncryption.crypto.subtle.encrypt(
                {
                    name: "AES-CTR",
                counter: new Uint8Array(16), // all 0s
                    length: 128,
                },
                keyEncoded,
                dataBuffer,
            );
            console.log("encbuf:", encrypted);
            // convert to plaintext
            const encodedText = Array.from(
                new Uint8Array(encrypted)
            )
                .map(number => number.toString(16).padStart(2, "0"))
                .join("");
            
            groupText += encodedText + this.joiner;
        }
        
        return groupText.slice(0, -1);
    }
    
    async decode(groupText, password) {
        const decoder = new TextDecoder();
        // reverse plaintext to buffer
        
        const keyEncoded = await this.encodePassword(password);
        
        // decrypt each segment
        const decryptions = await Promise.all(groupText.split(this.joiner).map(lineText => {
            const buffer = new Uint8Array(
                lineText
                    .match(/../g)
                    .map(hexString => parseInt(hexString, 16))
            );
            return GroupEncryption.crypto.subtle.decrypt(
                {
                    name: "AES-CTR",
                    counter: new Uint8Array(16), // all 0s
                    length: 128,
                },
                keyEncoded,
                buffer
            );
        }));
        const plaintexts = decryptions.map(decrypted => decoder.decode(new Uint8Array(decrypted)));
        
        const validPlaintexts = plaintexts.filter(text => text.startsWith(this.sentinel));
        if(validPlaintexts.length !== 1) {
            console.error(`Could not resolve number of valid plaintexts to 1; double check your password, or try a longer sentinel.`);
            console.error(validPlaintexts);
            return;
        }
        
        const targetSegment = validPlaintexts[0];
        const metaDataEnd = targetSegment.indexOf(this.joiner);
        const metaData = targetSegment.slice(0, metaDataEnd);
        const [, contentSize ] = metaData.match(/size=(\d+)/);
        const plaintext = targetSegment.substr(metaDataEnd + 1, contentSize);
        
        return plaintext;
    }
}

const nodeMain = async function () {
    const ge = new GroupEncryption();
    const fs = require("fs");
    const file = fs.readFileSync(process.argv[2]);
    const passwords = process.argv.slice(3);
    const encoded = await ge.encode(file, passwords);
    console.log(`<encrypted>\n    ${encoded}\n</encrypted>`);
};

if(typeof require !== "undefined") {
    GroupEncryption.crypto = require("crypto");
    module.exports = GroupEncryption;
    if(require.main === module) {
        nodeMain();
    }
}
else {
    GroupEncryption.crypto = window.crypto;
    window.CliCliConfig ??= {};
    window.addEventListener("load", function () {
        const style = document.createElement("style");
        style.textContent = `
            encrypted, encrypted input, encrypted button {
                font-family: "Consolas", monospace;
                overflow-wrap: anywhere;
            }
            encrypted button {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        // todo: initialize password field
        for(let encTag of document.getElementsByTagName("ENCRYPTED")) {
            // TODO: auto decrypt with saved passwords in localStorage
            // TODO: allow user to opt out of that
            const ge = new GroupEncryption(window.CliCliConfig);
            const encText = encTag.textContent.trim();
            const label = document.createElement("label");
            const input = document.createElement("input");
            input.type = "password";
            label.textContent = "Password:";
            label.appendChild(input);
            const button = document.createElement("button");
            button.textContent = "decode";
            encTag.prepend(button);
            encTag.prepend(label);
            
            const checkPassword = async () => {
                const password = input.value;
                console.log(password, encText);
                let decoded = await ge.decode(encText, password);
                if(!decoded) {
                    // TODO: don't use alert
                    alert("Invalid password.");
                    return;
                }
                encTag.outerHTML = decoded;
            };
            
            button.addEventListener("click", checkPassword);
            input.addEventListener("keydown", ev => {
                if(ev.key === "Enter") {
                    checkPassword();
                }
            });
        }
    });
}
