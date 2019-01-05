"use strict";

const appName = ["动漫草原", "","v0.1"];
const postsAccount = "dmcypostacct";
const managerAccount = "dmcymanagera";
const blockExploreURL = "https://telos.eosx.io/account/";
const transactOption = {
  blocksBehind: 3,
  expireSeconds: 90
};
let depositQuantity = "5.0000 TLOS";
const loadPostsCount = 40;
const initLoadPostsCount = 20;
const postsCountOffset = 0;
let enableDebug = false;

const apiNodes = {
  'Telos Miami':	['https','api.eos.miami',443],
  'Greymass':	['https','telos.greymass.com',443],
  'eos Barcelona':	['https','telos.eos.barcelona',443],
  'CRYPTOSUVI':	['https','telos.cryptosuvi.io',443],
  'TelosGreen':	['https','api.telos.telosgreen.com',443],
  'EOSphere':	['https','telos.eosphere.io',443],
  'EOSindex': ['https', 'api.telos.eosindex.io', 443]
}
const network = {
  blockchain: "eos",
  protocol: apiNodes["Telos Miami"][0],
  host: apiNodes["Telos Miami"][1],
  port: apiNodes["Telos Miami"][2],
  chainId: "4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11"
};