
const builder = require('botbuilder');
const restify = require('restify');
const cognitiveservices = require('botbuilder-cognitiveservices');
const Request = require('request');


//for cosmos db
var azure = require('botbuilder-azure');
const CosmosClient = require('@azure/cosmos').CosmosClient;
const config = require('./config');
//const url = require('url');
const endpoint = config.endpoint;
const masterKey = config.primaryKey;
const client = new CosmosClient({ endpoint: endpoint, auth: { masterKey: masterKey } });


var HttpStatusCodes = { NOTFOUND: 404 };
var databaseId = config.database.id;
var containerId = config.container.id;

var BotID;
var BotName;
var UserId;
var UserName;
var ConversationId;
var UserQuery;
var UserResponse;
var ChannelID;

var documentDbOptions = {
    host: 'https://gplflologiccosmosdbuat.documents.azure.com:443/', 
    masterKey: 'dmlyKuqhXlLQto7bY8tsZLJpM11Iq3x9FSKfllqZisN55YMrg18FfBJ6jh2u7JXWxAsnm44Um9iTijn4Geq77A==', 
    database: 'botdocs',   
    collection: 'botdata'
};

var docDbClient = new azure.DocumentDbClient(documentDbOptions);

var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);


var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3979, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog('FAQ');
    }
])
bot.set('storage', cosmosStorage);         // new builder.MemoryBotStorage() Register in-memory state storage
server.post('/api/messages', connector.listen());

bot.on("event",function(event) {
    var address=event.address;
    if (event.name === "btnRefresh") {
             
    }
    bot.beginDialog(address,'endConversationDialog');   
})

bot.dialog('endConversationDialog',[
    function (session, args, next) {
        session.conversationData = {};        
        session.send("You have stopped current conversation! that is okay, just ping me when you are ready and we can chat again.")              
        
        BotID=session.conversationData.botID;
        BotName=session.conversationData.botName;
        UserName=session.conversationData.userName;
        UserId=session.conversationData.userID;
        ConversationId=session.conversationData.conversationID;
                 
      // session.send("botid=%s botName=%s UserName=%s UserId=%s ConversationId=%s Date=%s DateTime=%s",BotID,BotName,UserName,UserId,ConversationId,date,datetime);
        createFamilyItem(BotID,BotName,ConversationId,UserId,UserName,session.message.text,"Conversation End..");

        session.endDialog();
    }]);

bot.dialog('FAQ', [
    function (session, args, next) {
        var qnaMakerResult
        const question = session.message.text;
        if(question == 'hi')
        {
        session.send("Hello! Wellcome to FAQ Bot");

        BotID=session.conversationData.botID;
        BotName=session.conversationData.botName;
        UserName=session.conversationData.userName;
        UserId=session.conversationData.userID;
        ConversationId=session.conversationData.conversationID;
                 
      // session.send("botid=%s botName=%s UserName=%s UserId=%s ConversationId=%s Date=%s DateTime=%s",BotID,BotName,UserName,UserId,ConversationId,date,datetime);
        createFamilyItem(BotID,BotName,ConversationId,UserId,UserName,session.message.text,"Conversation Start..");
         
    }
        else
        {
        const bodyText = JSON.stringify({ top: 5, question: question })
        const url1 = 'https://gplflologicqnauat.azurewebsites.net/qnamaker/knowledgebases/57e9931f-9351-4643-ac20-278022ae2e3c/generateAnswer';
        Request.post({ url: url1, body: bodyText, headers: { "Authorization": "EndpointKey 1061be55-5b2b-488d-8f94-67b09c283519", "Content-Type": "application/json" } }, (err, code, body) => {
            const response = JSON.parse(body);

            if (response.answers.length > 0) {
                session.dialogData.qnaMakerResult = qnaMakerResult = response;
                var questionOptions = [];
                qnaMakerResult.answers.forEach(function (qna) {
                    if (qna.score > 50) {
                        questionOptions.push(qna.questions[0]);
                    }
                });
                if (questionOptions.length > 1) {
                    var promptOptions = { listStyle: builder.ListStyle.button };
                    builder.Prompts.choice(session, "Multiple topics are found in response to your query. Select the relevant topic from the following:", questionOptions, promptOptions);
                }
                else {
                    let msg = new builder.Message(session)
                        .addAttachment({
                            contentType: "application/vnd.microsoft.card.adaptive",
                            content: {
                                type: "AdaptiveCard",
                                body: [
                                    {
                                        "type": "TextBlock",
                                        "text": question,
                                        "size": "large",
                                        "weight": "bolder",
                                        "color": "dark",
                                        "wrap": true
                                    },
                                    {
                                        "type": "TextBlock",
                                        "text": response.answers[0].answer,
                                        "size": "large",
                                        "weight": "regular",
                                        "color": "dark",
                                        "wrap": true
                                    }
                                ]
                            }
                        });
                    session.send(msg);


                    BotID=session.conversationData.botID;
                    BotName=session.conversationData.botName;
                    UserName=session.conversationData.userName;
                    UserId=session.conversationData.userID;
                    ConversationId=session.conversationData.conversationID;
                             
                  // session.send("botid=%s botName=%s UserName=%s UserId=%s ConversationId=%s Date=%s DateTime=%s",BotID,BotName,UserName,UserId,ConversationId,date,datetime);
                    createFamilyItem(BotID,BotName,ConversationId,UserId,UserName,session.message.text,"Question Answered");
                }
            }
            else {
                session.send('No data found for given query.Narrow your search.');
                session.endDialog();
            }

        })
        }
    },
    function (session, results) {
        var qnaMakerResult = session.dialogData.qnaMakerResult;
        var filteredResult = qnaMakerResult.answers.filter(function (qna) { return qna.questions[0] === results.response.entity; });
        var selectedQnA = filteredResult[0];
        let msg = new builder.Message(session)
            .addAttachment({
                contentType: "application/vnd.microsoft.card.adaptive",
                content: {
                    type: "AdaptiveCard",
                    body: [
                        {
                            "type": "TextBlock",
                            "text": selectedQnA.questions[0],
                            "size": "large",
                            "weight": "bolder",
                            "color": "dark",
                            "wrap": true
                        },
                        {
                            "type": "TextBlock",
                            "text": selectedQnA.answer,
                            "size": "large",
                            "weight": "regular",
                            "color": "dark",
                            "wrap": true
                        }
                    ]
                }
            });
        session.send(msg);

                    BotID=session.conversationData.botID;
                    BotName=session.conversationData.botName;
                    UserName=session.conversationData.userName;
                    UserId=session.conversationData.userID;
                    ConversationId=session.conversationData.conversationID;
                             
                  // session.send("botid=%s botName=%s UserName=%s UserId=%s ConversationId=%s Date=%s DateTime=%s",BotID,BotName,UserName,UserId,ConversationId,date,datetime);
                    createFamilyItem(BotID,BotName,ConversationId,UserId,UserName,selectedQnA.questions[0],"Question Answered");
       
    },
]).triggerAction({
    matches: 'FAQ'
})

function createFamilyItem(BotId,BotName,ConversationId,UserId,UserName,UserQuery,UserResponse)  {
    // var date = new Date();
     // var currentdate=date.toString("yyyy/MM/dd");
     // var n = date.getDate();
      var botname = "FaqBot";
      var datetime = new Date().getTime();
     // var currentDate = date.toISOString;
      var createdid = BotName + "|"+ UserId + "|" + datetime;
     var channelid="directline";
      var documentDefinition = {"id":createdid, 
          "ChannelID":channelid,
          "BotId":botname,
          "ConversationId":ConversationId,
          "UserID": UserId,
          "UserName": UserName,
          "UserQuery":UserQuery,
          "UserResponse":UserResponse,
          "LoginDate":datetime
     };
     try {
       var { item } =  client.database(databaseId).container(containerId).items.create(documentDefinition);
             console.log(`Created family item with id:\n${documentDefinition.id}\n`);      
     }
     catch (error) {
       console.log('Somthing getting worng',error);     
     }
    };