// Get date for thirty days ago
export const getThirtyDaysAgo = () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return thirtyDaysAgo;
};

//
// Test utils
//
type ConnectResponse = {
  token: string;
  pubkey: string;
};

export const mockConnect = async (): Promise<ConnectResponse> => {
  return { token: "testToken", pubkey: "testPubkey" };
};
