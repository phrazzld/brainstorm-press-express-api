import { EventEmitter } from "events";
import { existsSync, promises as fs } from "fs";

export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  votes: number;
  signature: string;
  pubkey: string;
  verified: boolean;
}

export const SocketEvents = {
  postUpdated: "post-updated",
  invoicePaid: "invoice-paid",
};

const DB_FILE: string = "db.json";

export interface LndNode {
  token: string;
  host: string;
  cert: string;
  macaroon: string;
  pubkey: string;
}

export interface DbData {
  posts: Array<Post>;
  nodes: Array<LndNode>;
}

export const PostEvents = {
  updated: "post-updated",
};

// Simple file-based DB for storing posts
class PostsDb extends EventEmitter {
  private _data: DbData = {
    posts: [],
    nodes: [],
  };

  //
  // Posts
  //

  getAllPosts = () => {
    return this._data.posts.sort((a, b) => b.votes - a.votes);
  };

  getPostById = (id: number) => {
    return this.getAllPosts().find((post) => post.id === id);
  };

  createPost = async (
    author: string,
    title: string,
    content: string,
    signature: string,
    pubkey: string
  ) => {
    // Calculate primary key
    const maxId = Math.max(0, ...this._data.posts.map((p) => p.id));

    const post: Post = {
      id: maxId + 1,
      title,
      content,
      author,
      votes: 0,
      signature,
      pubkey,
      verified: false,
    };
    this._data.posts.push(post);

    await this.persist();
    this.emit(PostEvents.updated, post);
    return post;
  };

  upvotePost = async (postId: number) => {
    const post = this._data.posts.find((p) => p.id === postId);
    if (!post) {
      throw new Error("Post not found");
    }
    post.votes += 1;
    await this.persist();
    this.emit(PostEvents.updated, post);
  };

  verifyPost = async (postId: number) => {
    const post = this._data.posts.find((p) => p.id === postId);
    if (!post) {
      throw new Error("Post not found");
    }
    post.verified = true;
    await this.persist();
    this.emit(PostEvents.updated, post);
  };

  //
  // Nodes
  //

  getAllNodes = () => {
    return this._data.nodes;
  };

  getNodeByPubkey = (pubkey: string) => {
    return this.getAllNodes().find((node) => node.pubkey === pubkey);
  };

  getNodeByToken = (token: string) => {
    return this.getAllNodes().find((node) => node.token === token);
  };

  addNode = async (node: LndNode) => {
    this._data.nodes = [
      // Add new node
      node,
      // Exclude existing nodes with the same server
      ...this._data.nodes.filter((n) => n.host !== node.host),
    ];
    await this.persist();
  };

  // Hack for persisting data to a JSON file when the server restarts.
  // Ultimately swap all this out for a real DB

  persist = async () => {
    await fs.writeFile(DB_FILE, JSON.stringify(this._data, null, 2));
  };

  restore = async () => {
    if (!existsSync(DB_FILE)) return;

    const contents = await fs.readFile(DB_FILE);
    if (contents) {
      this._data = JSON.parse(contents.toString());
      if (!this._data.nodes) {
        this._data.nodes = [];
      }
      console.log(`Loaded ${this._data.posts.length} posts`);
    }
  };
}

export default new PostsDb();
