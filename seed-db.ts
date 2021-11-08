import bcrypt from "bcryptjs";
import faker from "faker";
import * as _ from "lodash";
import { v4 as uuidv4 } from "uuid";
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

export const seedDb = async (): Promise<void> => {
  // If database is unpopulated, seed it
  // Otherwise, skip
  const userCount = await UserModel.count();
  const postCount = await PostModel.count();

  if (userCount === 0 && postCount === 0) {
    console.debug("Seeding database...");
    // Create some users
    const alicePw = await bcrypt.hash("alice", 10);
    const alice = await UserModel.create({
      username: "Alice",
      email: "alice@test.net",
      blog: "Awesome Stories",
      btcAddress: faker.finance.bitcoinAddress(),
      password: alicePw,
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
    });

    const davePw = await bcrypt.hash("dave", 10);
    const dave = await UserModel.create({
      username: "Dave",
      email: "dave@test.net",
      blog: "Film Stuff",
      btcAddress: faker.finance.bitcoinAddress(),
      password: davePw,
    });

    const users = [alice, bob, carol, dave];

    // Create some posts
    for (let i = 0; i < 100; i++) {
      const user = _.sample(users) || alice;
      const title = generateTitle();
      PostModel.create({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        content: generateContent(),
        published: Math.random() < 0.3 ? true : false,
        user: user._id,
        premium: Math.random() < 0.4 ? true : false,
      });
    }
    console.debug("Finished seeding database.");
  } else {
    console.debug("Database is not empty. Skipping seeding.");
  }
};
