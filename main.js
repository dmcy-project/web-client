"use strict";

//=====================================================
// Utils
const entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;"
};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function(s) {
    return entityMap[s];
  });
}
function formatDate(date) {
  return (
    date
      .getFullYear()
      .toString()
      .slice(2) +
    "/" +
    (date.getMonth() + 1) +
    "/" +
    date.getDate() +
    " " +
    date.getHours() +
    ":" +
    date.getMinutes()
  );
}

function formatSize(size) {
  if (size < 1000) return size;
  else if (size / 1000 < 1000) return (size / 1000).toFixed(1) + "KB";
  else if (size / 1000000 < 1000) return (size / 1000000).toFixed(1) + "MB";
  else return (size / 1000000000).toFixed(1) + "GB";
}

//=====================================================
// Setup
const pre = document.getElementsByTagName("pre")[0];

let eosAPI = null;
let account = null;
ScatterJS.plugins(new ScatterEOS());
const scatter = ScatterJS.scatter;
window.ScatterJS = null;
let currentDescription = "";
let currentTitle = "";
let headPostSeq = -1;
let tailPostSeq = -1;
let notifyTitle = null;
let notifyContent = null;
let notify = null;
// network
let apiNodesSelect = null;
let apiNodesStatus = null;
let apiNodeConnected = false;
let rpc = new eosjs_jsonrpc.default(
  network.protocol + "://" + network.host + ":" + network.port
);

//=====================================================
// Functions

// Whitelist
let whitelist = new Map();
let whitelistLoaded = false;
async function updateWhitelist() {
  try {
    const resp = await rpc.get_table_rows({
      json: true,
      code: managerAccount,
      scope: managerAccount,
      table: "whitelist",
      limit: 200
    });
    resp.rows.forEach(r => {
      whitelist.set(r.user, r.displayname);
    });

    logDebug("whitelist!");
    logDebug(JSON.stringify([...whitelist], null, 2));
    return true;
    //console.log(resp.rows);
  } catch (e) {
    logDebug("\nCaught exception: " + e);
    showNotify("读取白名单错误！", e, "error");
    if (e instanceof eosjs_jsonrpc.RpcError)
      logDebug(JSON.stringify(e.json, null, 2));
    return false;
  }
}

// Blacklist
let blacklist = new Map();
let blacklistLoaded = false;
async function updateBlacklist() {
  try {
    const resp = await rpc.get_table_rows({
      json: true,
      code: managerAccount,
      scope: managerAccount,
      table: "blacklist",
      limit: 200
    });
    resp.rows.forEach(r => {
      blacklist.set(r.user, r.time);
    });

    logDebug(JSON.stringify([...blacklist], null, 2));
    //console.log(resp.rows);
    return true;
  } catch (e) {
    showNotify("读取黑名单错误！", e, "error");
    if (e instanceof eosjs_jsonrpc.RpcError)
      logDebug(JSON.stringify(e.json, null, 2));
    return false;
  }
}

// Update API node stat
async function updateApiNodeStat(protocol, host, port) {
  network.protocol = protocol;
  network.host = host;
  network.port = port;
  rpc = new eosjs_jsonrpc.default(
    network.protocol + "://" + network.host + ":" + network.port
  );
  apiNodesStatus.removeClass();
  apiNodesStatus.text("连接中");
  if ((await updateBlacklist()) && (await updateWhitelist())) {
    apiNodesStatus.text("正常");
    apiNodesStatus.removeClass();
    apiNodesStatus.addClass("text-success");
    apiNodeConnected = true;
    return true;
  } else {
    apiNodesStatus.text("失败");
    apiNodesStatus.removeClass();
    apiNodesStatus.addClass("text-danger");
    apiNodeConnected = false;
    showNotify(
      "API节点连接失败！",
      `API节点${protocol}://${host}:${port}连接失败，
    请尝试选择其它API节点。`,
      "error"
    );

    return false;
  }
}
// Load posts
async function loadPosts(pos, offset, clearTable) {
  if (!apiNodeConnected) return;
  if (clearTable) $("#postsTable").empty();
  try {
    const resp = await rpc.history_get_actions(postsAccount, pos, offset);
    logDebug(JSON.stringify(resp, null, 2));
    //console.log(resp.actions);
    const actions = resp.actions.reverse();
    if (clearTable) {
      headPostSeq = actions[0].account_action_seq;
      $("#totalPostsCount").text(headPostSeq - (postsCountOffset+1));
    }
    tailPostSeq = actions[actions.length - 1].account_action_seq;
    actions.forEach(action => {
      // Only show post action
      if (
        action.action_trace.act.account !== postsAccount ||
        action.action_trace.act.name !== "post"
      )
        return;
      const data = action.action_trace.act.data;
      // Block post from blacklisted user after blocked time
      const postEpochTime = Number(new Date(action.block_time + "Z")) * 1000;
      if (
        blacklist &&
        blacklist.has(data.user) &&
        blacklist.get(data.user) <= postEpochTime
      )
        return;
      // Display name for post from whitelisted user
      let displayName = "";
      if (whitelist && whitelist.has(data.user)) {
        displayName = `<span class="badge badge-success">${escapeHtml(
          whitelist.get(data.user)
        )}</span>`;
      }
      let typeText = "";
      if (data.type === "anime") typeText = "动画";
      else if (data.type === "comic") typeText = "漫画";
      else if (data.type === "music") typeText = "音乐";
      else if (data.type === "game") typeText = "游戏";
      else if (data.type === "raw") typeText = "RAW";
      else typeText = "其它";
      $("#postsTable").append(`<tr>
      <td title="${postEpochTime}">${formatDate(
        new Date(action.block_time + "Z")
      )}</td>
      <td>${typeText}</td>
      <td  class="title">${displayName}<a href="#" class="postsRecord" data-des="${escapeHtml(
        data.description
      )}">${escapeHtml(data.title)}</a></td>
      <td><a href="${escapeHtml(
        data.uri
      )}"><i><img class="magnet" src="magnet-solid.svg"></i></a></td>
      <td>${formatSize(Number(data.size))}</td>
      <td><a href="${blockExploreURL +
        escapeHtml(data.user)}" target="_blank">${escapeHtml(data.user)}<a></td>
      </tr>`);
    });
  } catch (e) {
    logDebug("\nCaught exception: " + e);
    apiNodesStatus.text("失败");
    apiNodesStatus.removeClass();
    apiNodesStatus.addClass("text-danger");
    showNotify("读取发布记录错误！", e, "error");
    console.log(e);
    if (e instanceof eosjs_jsonrpc.RpcError)
      logDebug(JSON.stringify(e.json, null, 2));
  }
}

function showNotify(title, content, type) {
  notifyTitle.removeClass();
  notifyTitle.addClass("mr-auto");
  if (type === "error") notifyTitle.addClass("text-danger");
  else if (type === "success") notifyTitle.addClass("text-success");
  else notifyTitle.addClass("text-primary");
  notifyTitle.text(title);
  notifyContent.text(content);
  notify.toast("show");
}

function logDebug(str) {
  if (enableDebug) pre.textContent += "\n" + str;
}
// Connect Scatter
function connectScatter() {
  scatter.connect(appName[0]+appName[1]).then(connected => {
    if (!connected) {
      // User does not have Scatter installed/unlocked.
      console.log("User does not have Scatter installed/unlocked.");
      showNotify("使用Scatter登录错误！", "没有安装Scatter或没有解锁。", "error");
      return false;
    }

    console.log("scatter connected.");
    // Now we need to get an identity from the user.
    // We're also going to require an account that is connected to the network we're using.
    const requiredFields = { accounts: [network] };
    scatter
      .getIdentity(requiredFields)
      .then(() => {
        // Always use the accounts you got back from Scatter. Never hardcode them even if you are prompting
        // the user for their account name beforehand. They could still give you a different account.
        account = scatter.identity.accounts.find(x => x.blockchain === "eos");
        //console.log(account);
        $("#login-scatter").text("退出登录：" + account.name);
        eosAPI = new eosjs_api.default({
          rpc,
          signatureProvider: scatter.eosHook(network)
        });
        $("#dropdown-func").removeClass("disabled");
      })
      .catch(error => {
        // The user rejected this request, or doesn't have the appropriate requirements.
        console.error(error);
        showNotify(
          "使用Scatter登录错误！",
          error.type+": "+error.message,
          "error"
        );
      });
  });
}
function disconnectScatter() {
  scatter.logout();
  account = null;
  $("#login-scatter").text("使用Scatter登录");
  $("#dropdown-func").addClass("disabled");
  console.log("scatter disconnected.");
}

//=====================================================
// Init
$(function() {
  console.log("init!");

  // app name
  $("#appName").text(appName[0]);
  $("#appNameSub").text(appName[2]+appName[1]);
  document.title = appName[0]+appName[1];
  // network
  apiNodesSelect = $("#apiNodesSelect");
  apiNodesStatus = $("#apiNodesStatus");
  apiNodesSelect.empty();
  Object.keys(apiNodes).forEach(function(key) {
    let selected = "";
    if (localStorage.getItem("selectedBPName") === key) {
      selected = "selected";
      network.protocol = apiNodes[key][0];
      network.host = apiNodes[key][1];
      network.port = apiNodes[key][2];
    }
    apiNodesSelect.append(`
      <option ${selected} value="${apiNodes[key][0]}:${apiNodes[key][1]}:${apiNodes[key][2]}:${key}">
      [${key}]${apiNodes[key][0]}://${apiNodes[key][1]}:${apiNodes[key][2]}
      </option>
    `);
  });
  apiNodesSelect.on("change", async function() {
    const net = apiNodesSelect.val().split(":");
    if (await updateApiNodeStat(net[0], net[1], net[2])) {
      localStorage.setItem("selectedBPName", net[3]);
      showNotify(
        "API节点连接成功",
        `API节点${net[0]}://${net[1]}:${net[2]}工作正常`,
        "success"
      );
    }
  });

  // login
  $("#login-scatter").click(e => {
    e.preventDefault();
    if (account === null) connectScatter();
    else disconnectScatter();
  });
  // whitelist
  $("#whitelistModal").on("show.bs.modal", function(e) {
    $("#whitelistTable").empty();
    whitelist.forEach((displayName, name) => {
      $("#whitelistTable").append(`<tr>
      <td class="whitelistUser">${escapeHtml(name)}</td>
      <td>${escapeHtml(displayName)}</td></tr>`);
    });
    if (account !== null && account.name === managerAccount) {
      $(".whitelistUser").click(async e => {
        console.log(e.target.innerText);
        const name = e.target.innerText;
        const r = confirm("Erase whitelist " + name + "?");
        if (r === true) {
          try {
            const result = await eosAPI.transact(
              {
                actions: [
                  {
                    account: managerAccount,
                    name: "erasewl",
                    authorization: [
                      {
                        actor: managerAccount,
                        permission: "active"
                      }
                    ],
                    data: {
                      user: name
                    }
                  }
                ]
              },
              transactOption
            );
            logDebug(
              "\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2)
            );
            showNotify(
              "删除白名单成功！",
              JSON.stringify(result, null, 2),
              "success"
            );
          } catch (e) {
            showNotify("删除白名单错误！", e, "error");
            if (e instanceof eosjs_jsonrpc.RpcError)
              logDebug("\n\n" + JSON.stringify(e.json, null, 2));
          }
        }
      });
      $("#addWhitelistGroup").show();
    } else $("#addWhitelistGroup").hide();
  });
  $("#addWhitelist").click(async () => {
    if (account === null) return;
    try {
      const result = await eosAPI.transact(
        {
          actions: [
            {
              account: managerAccount,
              name: "upsertwl",
              authorization: [
                {
                  actor: managerAccount,
                  permission: "active"
                }
              ],
              data: {
                user: $("#wlName").val(),
                displayname: $("#wlDisName").val()
              }
            }
          ]
        },
        transactOption
      );
      logDebug("\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2));
      showNotify(
        "更新白名单成功！",
        JSON.stringify(result, null, 2),
        "success"
      );
    } catch (e) {
      logDebug("\nCaught exception: " + e);
      showNotify("更新白名单错误！", e, "error");
      if (e instanceof eosjs_jsonrpc.RpcError)
        logDebug(JSON.stringify(e.json, null, 2));
    }
  });

  // blacklist
  $("#blacklistModal").on("show.bs.modal", function(e) {
    $("#blacklistTable").empty();
    blacklist.forEach((time, name) => {
      $("#blacklistTable").append(`<tr>
      <td class="blacklistUser">${escapeHtml(name)}</td>
      <td>${formatDate(new Date(time / 1000))}</td>
      <td>${escapeHtml(time.toString())}</td></tr>`);
    });
    if (account !== null && account.name === managerAccount) {
      $("#blTime").val(Number(new Date()) * 1000);
      $(".blacklistUser").click(async e => {
        console.log(e.target.innerText);
        const name = e.target.innerText;
        const r = confirm("Erase blacklist " + name + "?");
        if (r === true) {
          try {
            const result = await eosAPI.transact(
              {
                actions: [
                  {
                    account: managerAccount,
                    name: "erasebl",
                    authorization: [
                      {
                        actor: managerAccount,
                        permission: "active"
                      }
                    ],
                    data: {
                      user: name
                    }
                  }
                ]
              },
              transactOption
            );
            logDebug(
              "\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2)
            );
            showNotify(
              "删除黑名单成功！",
              JSON.stringify(result, null, 2),
              "success"
            );
          } catch (e) {
            showNotify("删除黑名单错误！", e, "error");
            logDebug("\nCaught exception: " + e);
            if (e instanceof eosjs_jsonrpc.RpcError)
              logDebug(JSON.stringify(e.json, null, 2));
          }
        }
      });
      $("#addBlacklistGroup").show();
    } else $("#addBlacklistGroup").hide();
  });
  $("#addBlacklist").click(async () => {
    if (account === null) return;
    try {
      const result = await eosAPI.transact(
        {
          actions: [
            {
              account: managerAccount,
              name: "upsertbl",
              authorization: [
                {
                  actor: managerAccount,
                  permission: "active"
                }
              ],
              data: {
                user: $("#blName").val(),
                time: Number($("#blTime").val())
              }
            }
          ]
        },
        transactOption
      );
      showNotify(
        "更新黑名单成功！",
        JSON.stringify(result, null, 2),
        "success"
      );
    } catch (e) {
      logDebug("\nCaught exception: " + e);
      showNotify("更新黑名单错误！", e, "error");
      if (e instanceof eosjs_jsonrpc.RpcError)
        logDebug("\n\n" + JSON.stringify(e.json, null, 2));
    }
  });

  // post
  jQuery.validator.addMethod(
    "rangeLen",
    function(value, element, params) {
      const len = value.trim().length;
      const isValid = len >= params[0] && len <= params[1];
      if (isValid) element.setCustomValidity("");
      else element.setCustomValidity("Invalid length.");
      return isValid;
    },
    "长度错误"
  );
  jQuery.validator.addMethod(
    "magnet",
    function(value, element) {
      const isValid = value.startsWith("magnet:");
      if (isValid) element.setCustomValidity("");
      else element.setCustomValidity("Invalid magnet.");
      return isValid;
    },
    "磁链必须以“magnet:”开头"
  );

  $("#postModal").on("show.bs.modal", function(e) {
    if (whitelist && account && whitelist.has(account.name)) {
      $("#postSubmitHelp").text("你的账号在白名单内，发布不用支付押金");
    } else {
      $("#postSubmitHelp").text(
        "你的账号不在白名单内，发布需要支付押金: " + depositQuantity
      );
    }
  });

  const postForm = $("#postForm");
  postForm.validate({
    rules: {
      title: {
        rangeLen: [11, 199]
      },
      magnet: {
        rangeLen: [51, 1999],
        magnet: true
      },
      size: {
        min: 1,
        digits: true
      },
      description: {
        rangeLen: [0, 1999]
      }
    }
  });
  postForm.submit(function(event) {
    event.preventDefault();
    event.stopPropagation();
    postForm.addClass("was-validated");
    if (!postForm.valid()) return;

    $("#postInputSubmit").prop("disabled", true);
    const title = $("#postInputTitle").val();
    const magnet = $("#postInputMagnet").val();
    const typeText = $("#postInputType").val();
    let type = "";
    if (typeText === "动画") type = "anime";
    else if (typeText === "漫画") type = "comic";
    else if (typeText === "音乐") type = "music";
    else if (typeText === "游戏") type = "game";
    else if (typeText === "RAW") type = "raw";
    else type = "other";
    const sizeText = $("#postInputSizeUnit").val();
    let size = Number($("#postInputSize").val());
    if (sizeText === "KB") size = size * 1000;
    else if (sizeText === "MB") size = size * 1000 * 1000;
    else if (sizeText === "GB") size = size * 1000 * 1000 * 1000;
    const description = $("#postInputDescription").val();

    let actions = [
      {
        account: postsAccount,
        name: "post",
        authorization: [
          {
            actor: account.name,
            permission: account.authority
          }
        ],
        data: {
          user: account.name,
          size: size,
          title: title,
          uri: magnet,
          type: type,
          description: description
        }
      },
      {
        account: managerAccount,
        name: "validatepost",
        authorization: [
          {
            actor: account.name,
            permission: account.authority
          }
        ],
        data: {
          user: account.name
        }
      }
    ];

    if (!(whitelist && account && whitelist.has(account.name))) {
      actions.push({
        account: "eosio.token",
        name: "transfer",
        authorization: [
          {
            actor: account.name,
            permission: account.authority
          }
        ],
        data: {
          from: account.name,
          to: managerAccount,
          quantity: depositQuantity,
          memo: appName[0] + " post deposit"
        }
      });
    }

    (async () => {
      try {
        const result = await eosAPI.transact(
          {
            actions: actions
          },
          transactOption
        );
        logDebug(
          "\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2)
        );
        showNotify(
          "发布内容成功！",
          "交易已提交区块链，可能需要一段时间确认交易。请稍后刷新页面确认是否发布成功。",
          "success"
        );
        postForm.removeClass("was-validated");
        $("#postInputSubmit").prop("disabled", false);
        $("#postModal").modal("hide");
      } catch (e) {
        $("#postInputSubmit").prop("disabled", false);

        logDebug("\nCaught exception: " + e);
        showNotify("发布内容错误！", e, "error");
        if (e instanceof eosjs_jsonrpc.RpcError)
          logDebug(JSON.stringify(e.json, null, 2));
      }
    })();
  });

  // Refund
  $("#refundModal").on("show.bs.modal", function(e) {
    (async () => {
      try {
        const resp = await rpc.get_table_rows({
          json: true,
          code: managerAccount,
          scope: account.name,
          table: "deposits",
          limit: 100
        });
        $("#refundTable").empty();
        resp.rows.forEach(r => {
          const canRefundDate = new Date(r.time / 1000 + 172800000);
          const colorStr =
            new Date() > canRefundDate ? ' class="text-success"' : "";
          $("#refundTable").append(`<tr${colorStr}>
          <td>${escapeHtml(r.quantity)}</td>
          <td>${formatDate(new Date(r.time / 1000))}</td>
          <td>${formatDate(canRefundDate)}</td>
          <td>${
            new Date() > canRefundDate
              ? `<a href="#"${
                  new Date() > canRefundDate ? ' class="refundRecord"' : ""
                }>`
              : ""
          }${escapeHtml(r.time.toString())}${
            new Date() > canRefundDate ? "</a>" : ""
          }</td></tr>`);
        });
        $(".refundRecord").click(async e => {
          console.log(e.target.innerText);
          const deposittime = Number(e.target.innerText);
          const r = confirm("确定退押金项" + deposittime + "吗?");
          if (r === true) {
            try {
              const result = await eosAPI.transact(
                {
                  actions: [
                    {
                      account: managerAccount,
                      name: "refund",
                      authorization: [
                        {
                          actor: account.name,
                          permission: account.authority
                        }
                      ],
                      data: {
                        user: account.name,
                        deposittime: deposittime
                      }
                    }
                  ]
                },
                transactOption
              );
              showNotify(
                "交易提交成功！",
                "交易已提交区块链，可能需要一段时间确认交易。请稍后刷新页面确认是否退押金成功。",
                "success"
              );
              $("#refundModal").modal("hide");
              logDebug(
                "\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2)
              );
            } catch (e) {
              showNotify("退押金错误！", e, "error");
              logDebug("\nCaught exception: " + e);
              if (e instanceof eosjs_jsonrpc.RpcError)
                logDebug(JSON.stringify(e.json, null, 2));
            }
          }
        });

        //console.log(resp.rows);
      } catch (e) {
        showNotify("读取退押金记录错误！", e, "error");
        logDebug("\nCaught exception: " + e);
        if (e instanceof eosjs_jsonrpc.RpcError)
          logDebug(JSON.stringify(e.json, null, 2));
      }
    })();
  });

  // Close user
  $("#closeuserSubmit").click(async e => {
    try {
      const result = await eosAPI.transact(
        {
          actions: [
            {
              account: managerAccount,
              name: "closeuser",
              authorization: [
                {
                  actor: account.name,
                  permission: account.authority
                }
              ],
              data: {
                user: account.name
              }
            }
          ]
        },
        transactOption
      );
      showNotify(
        "交易提交成功！",
        "交易已提交区块链，可能需要一段时间确认交易。",
        "success"
      );
      $("#closeuserModal").modal("hide");
      logDebug("\n\nTransaction pushed!\n\n" + JSON.stringify(result, null, 2));
    } catch (e) {
      showNotify("清除用户记录错误！", e, "error");
      logDebug("\nCaught exception: " + e);
      if (e instanceof eosjs_jsonrpc.RpcError)
        logDebug("\n\n" + JSON.stringify(e.json, null, 2));
    }
  });

  // Posts table
  $("#postsTable").on("click", ".postsRecord", function(e) {
    e.preventDefault();
    currentDescription = String($(this).data("des"));
    currentTitle = $(this).text();
    //console.log(currentDescription);
    $("#descriptionModal").modal("show");
  });
  marked.setOptions({ sanitize: true });
  $("#descriptionModal").on("show.bs.modal", function(e) {
    $("#descriptionContent").html(
      marked(currentDescription, { sanitize: true })
    );
    $("#descriptionModalLabel").text(currentTitle);
  });

  const loadPostsSpin = $("#loadPostsSpin");
  const loadPostsButton = $("#loadPosts");
  loadPostsButton.click(async e => {
    loadPostsButton.prop("disabled", true);
    loadPostsSpin.removeClass("d-none");
    if (headPostSeq === -1) {
      await loadPosts(-1, -initLoadPostsCount, true);
    } else if (tailPostSeq > 0) {
      await loadPosts(tailPostSeq - 1, -(loadPostsCount - 1));
    }
    loadPostsButton.prop("disabled", false);
    loadPostsSpin.addClass("d-none");
  });

  // notification
  notify = $(".toast").toast({ autohide: false });
  notifyTitle = $("#notifyTitle");
  notifyContent = $("#notifyContent");

  (async () => {
    if (await updateApiNodeStat(network.protocol, network.host, network.port)) {
      await loadPosts(-1, -initLoadPostsCount, true);
    }
  })();
  console.log("init end!");
});
