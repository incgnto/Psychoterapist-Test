import { MongoClient } from "mongodb";

const options = {};

let client: MongoClient | undefined;
let clientPromise: Promise<MongoClient>;

// Avoid throwing at import time to keep builds working without envs.
// Create a lazily-usable promise that will reject at runtime if missing.
const uri = process.env.MONGODB_URI;

// Add type to global for TypeScript
declare global {
	// eslint-disable-next-line no-var
	var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
	// Create a rejected promise that surfaces a clear error only when awaited
	clientPromise = Promise.reject(new Error("MONGODB_URI is not set. Add it to your environment (.env.local)."));
} else if (process.env.NODE_ENV === "development") {
	if (!global._mongoClientPromise) {
		client = new MongoClient(uri, options);
		global._mongoClientPromise = client.connect();
	}
	clientPromise = global._mongoClientPromise as Promise<MongoClient>;
} else {
	client = new MongoClient(uri, options);
	clientPromise = client.connect();
}

export default clientPromise;
