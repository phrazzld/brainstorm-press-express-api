import bcrypt from "bcryptjs";
import faker from "faker";
import * as _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import { LnNodeModel } from "./models/ln-node";
import { PostModel } from "./models/post";
import { UserModel } from "./models/user";

type DraftJsBlock = {
  key: string;
  text: string;
  type: string;
  depth: number;
  inlineStyleRanges: Array<any>;
  entityRanges: Array<any>;
  data: object;
};

type DraftJsContent = {
  blocks: Array<DraftJsBlock>;
  entityMap: object;
};

const ALICE_HOST = "127.0.0.1:10001";
const ALICE_CERT =
  "2d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d4949434a6a43434163796741774942416749514f744f7161464a695257733157517934663836585944414b42676771686b6a4f50515144416a41784d5238770a485159445651514b45785a73626d5167595856306232646c626d56795958526c5a43426a5a584a304d51347744415944565151444577566862476c6a5a5441650a467730794d5445774d6a49774d5449784d446861467730794d6a45794d5463774d5449784d4468614d444578487a416442674e5642416f54466d78755a4342680a645852765a3256755a584a686447566b49474e6c636e5178446a414d42674e5642414d544257467361574e6c4d466b77457759484b6f5a497a6a3043415159490a4b6f5a497a6a30444151634451674145464f41416551756a465a466335394b7877483158384759626d5752366a6b6856744679666a6d4273356773574e5249430a63655666336f4450394f4162514f6b37526a786c3766476e36316e487953665872766b4e37614f4278544342776a414f42674e56485138424166384542414d430a41715177457759445652306c42417777436759494b775942425155484177457744775944565230544151482f42415577417745422f7a416442674e56485134450a46675155444e45545172495649446368576a6261784649366f55437566513877617759445652305242475177596f4946595778705932574343577876593246730a6147397a644949465957787059325743446e4276624746794c5734304c57467361574e6c67675231626d6c3467677031626d6c346347466a61325630676764690a64575a6a623235756877522f4141414268784141414141414141414141414141414141414141414268775373464141464d416f4743437147534d343942414d430a413067414d4555434951444b48427175585272366a6165443442306c774667436945534c64576d386b79366141796952364556746d51496762696162706c67540a79592b346c3736447a71574832454d536e635a4c594f77574e44506e7946554d4157303d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a";
const ALICE_MACAROON =
  "0201036c6e640267030a10fd411edacb4d02ecaebc7cb2ba90bccd1201301a0c0a04696e666f1204726561641a170a08696e766f69636573120472656164120577726974651a160a076d657373616765120472656164120577726974651a100a086f6666636861696e120472656164000006202922dcca3b07acbe09572a2aa949b6273de9b0e0d17df43658c98c69f4650a75";

const generateTitle = (): string => {
  const r = Math.random();
  if (r < 0.5) {
    return faker.company.bs();
  }
  return faker.animal.snake();
};

const generateContent = (): string => {
  const draftJsContent: DraftJsContent = {
    blocks: [
      {
        key: uuidv4(),
        text: faker.lorem.paragraph(),
        type: "unstyled",
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {},
      },
    ],
    entityMap: {},
  };

  return JSON.stringify(draftJsContent);
};

export const seedDb = async (connectNode: any): Promise<void> => {
  // If database is unpopulated, seed it
  // Otherwise, skip
  const userCount = await UserModel.count();
  const postCount = await PostModel.count();

  if (userCount === 0 && postCount === 0) {
    console.log("Seeding database...");
    // Create some users
    const alicePw = await bcrypt.hash("alice", 10);
    const alice = await UserModel.create({
      username: "Alice",
      email: "alice@test.net",
      blog: "Awesome Stories",
      btcAddress: faker.finance.bitcoinAddress(),
      password: alicePw,
      subscriptionPrice: 10000,
    });

    const bobPw = await bcrypt.hash("bob", 10);
    const bob = await UserModel.create({
      username: "Bob",
      email: "bob@bobrules.com",
      blog: "Bonkers Blabs",
      password: bobPw,
    });

    const carolPw = await bcrypt.hash("carol", 10);
    const carol = await UserModel.create({
      username: "Carol",
      email: "carol@aol.com",
      blog: "Cooking Tips and Tricks",
      password: carolPw,
      subscriptionPrice: 5000,
    });

    const davePw = await bcrypt.hash("dave", 10);
    const dave = await UserModel.create({
      username: "Dave",
      email: "dave@test.net",
      blog: "Film Stuff",
      btcAddress: faker.finance.bitcoinAddress(),
      password: davePw,
      subscriptionPrice: 1000,
    });

    const cypressPw = await bcrypt.hash("test-password", 10);
    const cypress = await UserModel.create({
      username: "cypress-tester",
      email: "cypress@test.net",
      blog: "Having Fun With End-to-End Testing",
      password: cypressPw,
    });

    const users = [alice, bob, carol, dave, cypress];

    // Create LN node for Alice
    const { token, pubkey } = await connectNode(
      ALICE_HOST,
      ALICE_CERT,
      ALICE_MACAROON
    );
    const node = new LnNodeModel({
      host: ALICE_HOST,
      cert: ALICE_CERT,
      macaroon: ALICE_MACAROON,
      token: token,
      pubkey: pubkey,
    });
    await node.save();
    await UserModel.findOneAndUpdate({ _id: alice._id }, { node: node._id });

    // Create test post for testing search
    PostModel.create({
      title: "Buried Treasure",
      content: generateContent(),
      published: true,
      user: alice._id,
      premium: true,
    });

    // Create some posts
    for (let i = 0; i < 100; i++) {
      const user = _.sample(users) || alice;
      const title = generateTitle();
      PostModel.create({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        content: generateContent(),
        published: Math.random() < 0.3 ? true : false,
        user: user._id,
        premium: i % 2 === 0 ? true : false,
      });
    }
    console.log("Finished seeding database.");
  } else {
    console.log("Database is not empty. Skipping seeding.");
  }
};
