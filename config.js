"use strict";

const appName = ["动漫草原", "（测试网）","v0.1"];
const postsAccount = "dmcypostacct";
const managerAccount = "dmcymanagera";
//const blockExploreURL = "https://telos-test.eosx.io/account/";
const blockExploreURL = "https://mon-test.telosfoundation.io/account/";
const transactOption = {
  blocksBehind: 3,
  expireSeconds: 90
};
let depositQuantity = "5.0000 TLOS";
const loadPostsCount = 40;
const initLoadPostsCount = 20;
const postsCountOffset = 16;
let enableDebug = false;

const apiNodes = {
  'Telos Miami':	['https','testnet.eos.miami',443],
  'AtticLab':	['http','159.69.63.222',7777],
  'blindblocart':	['http','109.237.25.217',3888],
  'EOS Detroit':	['https','testnet.telos.eosdetroit.io',443],
  'EOS Nairobi':	['http','telosafrique.eosnairobi.io',9938],
  'eosBarcelona':	['http','telos.eosbcn.com',8080],
  'EOSindex':	['https','api.testnet.telos.eosindex.io',443],
  'Eosmetal':	['http','164.132.203.74',28888],
  'EosOU':	['http','api.eosou.io',18888],
  'infinitybloc':	['http','173.255.220.117',3888],
  'JijiPlan DAC':	['http','207.148.6.75',8888],
  'Swedencornet':	['https','testnet.telos.eossweden.eu',443],
  'Telos Canton':	['https','apitestnode1.teloscanton.io',443],
  'Telos China':	['https','testnet.telasiachina.com',8889],
  'Telos GoingOS':	['https','testnet.goingos.org',443],
  'Telos Green':	['http','api.testnet.telosgreen.com',8888],
  'Telos Intasia':	['http','telostestnet.ikuwara.com',8888],
  'Telos Madrid':	['http','95.216.18.207',8888],
  'Telos New York':	['http','api.testnet.nytelos.com',80],
  'Telos UK':	['https','testnet-api.telosuk.io',443],
  'Telos Unlimited':	['https','api.testnet.telosunlimited.io',443],
  'Telos Vancouver':	['http','testnet.telosvancouver.io',8888],
  'Telos Venezuela':	['https','api.telosvenezuela.com',443],
  'Telos Voyager':	['http','test.api.telosvoyager.io',2888],
  'Telos-21Zephyr':	['http','testnet.telos-21zephyr.com',8888],
  'TelosDAC':	['http','149.28.231.187',8888],
  'TelosGlobal':	['http','node1.testnet.telosglobal.io',8888],
  'TelosGlobal':	['http','node2.testnet.telosglobal.io',8888],
  'The Teloscope':	['http','testnet.theteloscope.io',18888]
}
const network = {
  blockchain: "eos",
  protocol: apiNodes["Telos Miami"][0],
  host: apiNodes["Telos Miami"][1],
  port: apiNodes["Telos Miami"][2],
  chainId: "e17615decaecd202a365f4c029f206eee98511979de8a5756317e2469f2289e3"
};