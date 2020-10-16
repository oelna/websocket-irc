/*
to do before 1.0

- badge tabs with new message number
- user name colors
- mark messages sent by user, even after nick change

*/

// import Vue from './vue.esm.browser.js'; // replace with vue.esm.browser.min.js for production
import { createApp, ref } from './vue.esm-browser.js';
import { Parser } from './parser.js';

const app = {
	'parser': new Parser(),
	'messageLog': [],
	'autoJoin': ['#html', '#int'],
	'sendMessage': function (text, channel) {

		if (text.startsWith('/') || !channel) {
			app.connection.ws.send(text.substring(1)+"\r\n");
		} else {
			channel = (channel.startsWith('#')) ? channel : '#'+channel;
			app.connection.ws.send('PRIVMSG '+channel+' :'+text+"\r\n");

			const tab = app.messageWindow.get(channel);
			if (!tab) {
				console.error('You can\'t talk here, you need to join a channel first!');
				return;
			}
			
			// app.messageWindow.addMessage(text, channel); // obsolete as per echo-message
		}
	},
	'formatDatetime': function (ts, mode) {
		/* via https://gist.github.com/kmaida/6045266 */

		if (!ts) ts = Date.now();

		const d = new Date(ts);
		const yyyy = d.getFullYear();
		const mm = (d.getMonth() + 1).toString().padStart(2, '0');
		const dd = d.getDate().toString().padStart(2, '0');
		const hh = d.getHours().toString().padStart(2, '0');
		const min = d.getMinutes().toString().padStart(2, '0');
		const sec = d.getSeconds().toString().padStart(2, '0');

		const time = yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + ':' + sec;
		const shorttime = hh + ':' + min;

		return (mode && mode == 'short') ? shorttime : time;
	}
};
/*
app.demo = createApp({
	'data': function () {
		return {
			'messages': [],
			'tabs': ['0'],
			'dms': []
		}
	},
	'created': function () {
		this.$watch('messages', (newVal) => {
			if (newVal.length < 1) return;

			

			const newMessage = newVal[newVal.length - 1];
			console.warn('new msg', newMessage);
			const target = this.getMessageTarget(newMessage);



			if (target.startsWith('#') || target === '0') {
				// is a channel
				if (!this.tabs.includes(target)) {
					this.tabs.push(target);
				}
			} else {
				// is a user aka. DM
				if (!this.dms.includes(target)) {
					this.dms.push(target);
				}
			}

		}, { 'deep': true });
	},
	'methods': {
		'getMessageTarget': function (msg) {
			if (!msg) return false;

			const commands1 = ['PRIVMSG', 'PART', 'JOIN', 'KICK', 'NAMES', 'TOPIC', 'WHO'];

			if (commands1.indexOf(msg.command) !== -1) {
				return msg.params[0] ? msg.params[0] : '0';
			}

			if (!isNaN(msg.command)) {
				// numeric status codes
				return '0';
			}

			// todo: add more message types here

			return '0';
		},
		'getChannel': function (channel) {
			const self = this;

			const filteredMessages = this.messages.filter(function (msg) {

				if (self.getMessageTarget(msg) == channel) {
					return true;
				}

				return false;
			});

			return filteredMessages;
		}
	}
}).mount('#demo');
*/
const seed = Math.floor(Math.random()*100000+1);
app.user = createApp({
	'data': function () {
		return {
			'username': 'guest_'+seed,
			'nick': 'guest_'+seed,
			'lastLegalNick': null,
			'realname': 'Unknown',
			'lockInput': false,
			'visible': true,
			'colorTheme': null
		}
	},
	'created': function () {
		const userString = localStorage.getItem('user');
		if (userString) {
			const user = JSON.parse(userString);

			this.username = user.username;
			this.realname = user.realname;
			this.nick = user.nickname;
		}

		// interpret manually changed color theme for the website
		const savedTheme = localStorage.getItem('theme');
		if (savedTheme) {
			this.colorTheme = (savedTheme == 'dark') ? 'dark' : 'light';

			document.documentElement.setAttribute('data-theme', this.colorTheme);
			localStorage.setItem('theme', this.colorTheme);
		}
	},
	'methods': {
		'save': function () {
			const data = {
				'username': this.username,
				'realname': this.realname,
				'nickname': this.nick
			}
			console.warn('saving user data to localstorage');

			this.username = data.username;
			this.realname = data.realname;
			this.nick = data.nickname;

			localStorage.setItem('user', JSON.stringify(data));
		},
		'updateNick': function () {

			if (!this.validNick(this.nick)) {
				console.error('nickname contains invalid characters!');
				this.nick = this.lastLegalNick;
				// this.nick = this.nick.replace(/[^a-z0-9\/\[\]\{\}\._-]/gim, '-');
				return;
			}

			this.save(); // this should potentially be done somewhere different

			if (app.server.connected) {
				app.connection.ws.send('NICK '+this.nick);
			}
		},
		'validNick': function (nick) {
			// this is potentially not totally correct
			const regex = RegExp(/^[a-zA-Z][a-zA-Z0-9\[\]\{\}_-].{2,12}$/);
			// const regex = RegExp(/\A[a-z_\-\[\]\\^{}|`][a-z0-9_\-\[\]\\^{}|`]{2,11}\z/);

			return regex.test(nick);
		},
		'toggleTheme': function () {

			if (this.colorTheme) {
				this.colorTheme = (this.colorTheme == 'dark') ? 'light' : 'dark';
			} else {
				if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
					// change to light
					this.colorTheme = 'light';
				} else {
					// change to dark
					this.colorTheme = 'dark';
				}
			}

			document.documentElement.setAttribute('data-theme', this.colorTheme);
			localStorage.setItem('theme', this.colorTheme);
		}
	}
}).mount('#userdata');

app.channelList = createApp({
	// 'el': '#channels',
	'data': function () {
		return {
			'visible': true,
			'channels': []
		}
	},
	'methods': {
		'join': function (e, channel) {

			if (app.connection.ws === null) return;

			console.log('joining channel', channel);
			app.connection.ws.send('JOIN '+channel);

			// add UI element tab for the channel
			app.messageWindow.addTab(channel);
		},
		'refresh': function () {
			if (app.connection.ws === null) return;

			app.connection.ws.send('LIST');
		},
		'clear': function () {
			this.channels = [];
		}
	}
}).mount('#channels');

app.dm = createApp({
	// 'el': '#dm',
	'data': function () {
		return {
			'visible': true,
			'history': 6,
			'conversations': []
		}
	},
	'computed': {
		'getActive': function () {
			return this.conversations.find(conv => conv.active === true);
		},
		'unreadMessages': function () {
			const reducer = (unread, currentValue) => unread + currentValue.unread;
			const unread = this.conversations.reduce(reducer, 0);
			return unread;
		}
	},
	'methods': {
		'newConversation': function (user) {
			if (user.startsWith('@')) user = user.substring(1);

			for (const c of this.conversations) {
				c.active = false;
			}

			let conv = this.get(user);
			if (!conv) {
				// create a new conversation
				const newConv = {
					'title': user,
					'active': true,
					'messages': [],
					'unread': 0
				};
				this.conversations.unshift(newConv);
			} else {
				// simply bring the conversation to the foreground
				conv.active = true;
				conv.unread = 0;
			}
		},
		'showConversation': function (user) {
			if (user.startsWith('@')) user = user.substring(1);

			let conv = this.get(user);
			if (conv && conv.active == false) {
				for (const c of this.conversations) {
					c.active = false;
				}
				conv.active = true;
				conv.unread = 0;
			} else if (conv && conv.active == true) {
				// toggle
				conv.active = false;
			}
		},
		'addMessage': function (user, msg) {
			if (user.startsWith('@')) user = user.substring(1);

			let conv = this.get(user);
			if (!conv) {
				// create a new conversation
				const newConv = {
					'title': user,
					'active': false,
					'messages': [],
					'unread': 0
				};
				this.conversations.unshift(newConv);
				conv = newConv;
			}

			conv.messages.push(msg);
			if (conv.messages.length > this.history) {
				conv.messages.shift();
			}

			if (msg.prefix.nick == user && !conv.active) {
				conv.unread += 1;
			}

			// trigger event
			const customEvent = new Event('newDM');
			//const root = ref(0);
			const root = this.$el.parentElement; // todo: fix this by using ref() ?

			root.dispatchEvent(customEvent);
		},
		'get': function (user) {
			if (user.startsWith('@')) user = user.substring(1);

			return this.conversations.find(tab => tab.title === user);
		},
		'sendDM': function (user, text, event) {
			if (!app.server.connected) {
				console.error('You are not connected to a server!');
				return;
			}
			if (user.startsWith('@')) user = user.substring(1);

			console.info('sending DM to user ', user, text);
			if (text.startsWith('/') || user.length < 1) return;
			const messageString = 'PRIVMSG '+user+' :'+text;
			app.connection.ws.send(messageString);

			const conv = this.get(user);
			if (conv) {
				conv.input = '';
				if (event) {
					event.target.querySelector('input[type="text"]').focus();
				}
			}
		},
		'formatDatetime': app.formatDatetime
	}
}).mount('#dm');

app.messageWindow = createApp({
	// 'el': '#messages',
	'data': function () {
		return {
			'visible': true,
			'showHelp': false,
			'tabs': [],
			'inputLog': [],
			'inputLogIndex': null,
			'input': ''
		}
	},
	'computed': {
		'activeTab': function () {
			return this.tabs.find(tab => tab.active === true);
		}
	},
	'created': function () {
		const serverTab = {
			'title': 'server',
			'active': true,
			'messages': [],
			'users': []
		};
		this.tabs.push(serverTab);
	},
	'updated': function () {
		if (!this.activeTab) return;

		// const root = this.$el.parentElement;
		const root = this.$refs.root;
		const msgList = root.querySelector('[data-title="'+this.activeTab.title+'"] .messages');

		if (msgList) { msgList.scrollTop = msgList.clientHeight; }
	},
	'methods': {
		'get': function (title) {
			const tab = this.tabs.find(o => o.title === title);

			return (tab) ? tab : false;
		},
		'activate': function (title) {
			if (!this.get(title)) return false;

			for (const tab of app.messageWindow.tabs) {
				if (tab.title == title) {
					tab.active = true;
				} else {
					tab.active = false;
				}
			}
		},
		'addTab': function (channel, activate=true) {
			const exists = this.tabs.find(o => o.title === channel);
			if (exists) {
				this.activate(channel);
			} else {
				const newTab = {
					'title': channel,
					'active': false,
					'messages': [],
					'users': []
				};
				this.tabs.push(newTab);
				if (activate) this.activate(newTab.title);

				/*
				this.addRawCommand(':'+app.user.nick+'!'+app.user.username+'@127.0.0.1 STATUS '+channel+' :joined the channel');
				*/
			}
		},
		'closeTab': function (channel) {
			app.connection.ws.send('PART '+channel);
		},
		'removeTab': function (channel) {
			const index = this.tabs.findIndex(o => o.title === channel);

			if (index > -1) {
				this.tabs.splice(index, 1);
			}

			// set a new active tab
			const lastTab = this.tabs[this.tabs.length-1];
			this.activate(lastTab.title);
		},
		'formatDatetime': app.formatDatetime,
		'msgType': function (message) {
			// console.log('msg type', message);
			if (message.prefix) {
			// console.error(message, message.prefix.nick,'@'+app.user.nick);
			}

			if (message.prefix && !message.prefix.isServer && (message.prefix.nick == app.user.nick || message.prefix.nick == '@'+app.user.nick)) {
				// this is a normal PRIVMSG sent by you
				return 'self';
			}

			const addressedToYou = new RegExp('@'+app.user.nick + '\\b');
			if (addressedToYou.test(message.params.join(' '))) {
				// this is a PRIVMSG mentioning you
				return 'mention';
			}

			if (message.command && message.command.toUpperCase() == 'PRIVMSG') {
				// this is a PRIVMSG
				return 'pm';
			}

			return '';
		},
		'addMessage': function (text, channel) {
			if (!text || !channel) return;

			const command = ':'+app.user.nick+'!'+app.user.username+'@127.0.0.1 PRIVMSG '+channel+' :'+text;
			this.addRawCommand(command);
		},
		'addRawCommand': function (str) {
			if (!str) return;

			const customEvent = new Event('customCommand');
			customEvent.data = str+"\r\n";

			app.connection.onMessage(customEvent);
		},
		'newDM': function (user) {
			if (user.startsWith('@')) user = user.substring(1);

			if (user == app.user.nick) return; // this is you, dummy!

			app.dm.newConversation(user);
		},
		'send': function () {

			// const msgField = document.querySelector('#msg');
			const msgField = this.$refs.msgField;

			// add to input log for recent messages functionality
			this.inputLog.unshift(this.input);
			if (this.inputLog.length > 9) { this.inputLog.slice(0,9); }

			// parse the input
			const parsed = app.parser.parse(this.input);
			if (parsed.command.startsWith('/')) {
				parsed.command = parsed.command.substring(1).toUpperCase();
			}

			const activeTab = app.messageWindow.activeTab.title;

			// smart NAMES command in channels
			if (parsed.command == 'NAMES' && activeTab !== 'server') {
				this.input = '/'+parsed.command+' '+activeTab;
			}

			// MSG shorthand
			if (parsed.command == 'MSG' && activeTab !== 'server') {
				this.input = this.input.replace('/MSG', '/PRIVMSG');
			}

			// direct message shorthand with /w
			if (parsed.command.toUpperCase() == 'W' && parsed.params[0].startsWith('@')) {
				const recipient = parsed.params[0].substring(1);
				const message = parsed.params.slice(1).join(' ');
				this.input = '/PRIVMSG '+recipient+' '+message;
			}

			console.log('parsed input', parsed);
			app.sendMessage(this.input, (activeTab == 'server') ? '' : activeTab);
			
			this.input = ''; // reset text input
			this.inputLogIndex = null; // reset history
			if (msgField) { msgField.focus(); }
		},
		'keyUp': function (event) {
			// keyboard input history!

			if (event.keyCode == 38) { // up arrow
				if (this.inputLog.length > 0) {
					if (this.inputLogIndex !== null) {
						this.inputLogIndex += 1;

						if (!this.inputLog[this.inputLogIndex]) {
							this.inputLogIndex -= 1;
							return;
						}
					} else {
						this.inputLogIndex = 0;
					}

					this.input = this.inputLog[this.inputLogIndex];
				}
			}

			if (event.keyCode == 40) { // down arrow
				if (this.inputLog.length > 0) {
					if (this.inputLogIndex !== null) {
						if (this.inputLogIndex === 0) {
							this.input = '';
							this.inputLogIndex = null;
							return;
						}

						this.inputLogIndex -= 1;

						if (!this.inputLog[this.inputLogIndex]) return;

						this.input = this.inputLog[this.inputLogIndex];
					}
				}
			}
		}
	}
}).mount('#chats');

app.connection = createApp({
	'data': function () {
		return {
			'ws': null
		}
	},
	'methods': {
		'connect': function () {
			const conn = 'wss://'+app.server.url+':'+app.server.port;
			this.ws = new WebSocket(conn);

			console.log('connecting to', conn);

			this.ws.onopen = this.onOpen;
			this.ws.onerror = this.onError;
			this.ws.onclose = this.onClose; 
			this.ws.onmessage = this.onMessage;
		},
		'disconnect': function () {
			// app.sendMessage('/QUIT');
			this.ws.send('QUIT');
			// if the QUIT command works, no need to manually call close
			// this.ws.close();
		},
		'onOpen': function (event) {
			console.log('INFO: Socket Opened');
			app.server.connected = true;
			app.user.lockInput = true; // prevent changes to user data

			this.ws.send('CAP LS 302');
			this.ws.send('NICK '+app.user.nick);
			this.ws.send('USER '+app.user.username+' 0 * :'+app.user.realname);
			
			// todo: do these as a reply to the list sent by the server
			// https://unitedchat.org/ircv3
			this.ws.send('CAP REQ :message-tags');
			this.ws.send('CAP REQ :server-time');
			this.ws.send('CAP REQ :echo-message');
			this.ws.send('CAP END');
		},
		'onError': function (error) {
			console.log('ERR: ', error);
		},
		'onClose': function (event) {
			console.log('INFO: Socket Closed');

			this.ws.onopen = function () {};
			this.ws.onerror = function () {};
			this.ws.onclose = function () {};
			this.ws.onmessage = function () {};

			this.ws = null;
			app.server.connected = false;
			app.user.lockInput = false;

			const openChannels = app.messageWindow.tabs.map(function (a) {
				return a.title;
			});

			for (const channel of openChannels) {
				// app.messageWindow.addMessage('closed the connection.', channel);
				app.messageWindow.addRawCommand(':'+app.user.nick+'!'+app.user.username+'@127.0.0.1 STATUS '+channel+' :closed the connection.');
			}
		},
		'onMessage': function (event) {
			// console.log('RECV: ', event.data, event);

			const data = (event.detail) ? event.detail : event.data;
			
			const msg = app.parser.parse(data);
			app.messageLog.push(msg);
			// app.demo.messages.push(msg);

			// this can be overridden to display a message in a different tab
			let targetTab = 'server';

			console.info('cmd', msg.command, msg);

			// handle ping/pong
			if (msg.command && msg.command.toUpperCase() == 'PING') {
				const messageParts = data.split(' ');
				// console.log('replying with:', 'PONG '+messageParts[1]);
				this.ws.send('PONG '+messageParts[1]);
				return;
			}

			if (msg.prefix && msg.prefix.isServer && msg.prefix.host == app.server.url) {
				//console.warn('server message:', event.data);
			}

			if (msg.command == '001') {
				// if the login is accepted, save user data
				app.user.lastLegalNick = app.user.nick;
				app.user.save();
			}

			if (msg.command == '376' || msg.command == '422') {
				// message of the day, request initial LIST
				this.ws.send('LIST');

				// auto-join channels, if specified
				if (app.autoJoin.length > 0) {
					this.ws.send('JOIN '+app.autoJoin.join(','));
				}
			}

			if (msg.command == '321') {
				// list items ("channels"), begin list
				app.channelList.clear();
			}

			if (msg.command == '322') {
				// list items ("channels"), add to list
				console.warn('add channel to list', msg.params);
				app.channelList.channels.push(msg.params[1]);
			}

			if (msg.command == '323') {
				// sort channel display after building list
				if (app.channelList.channels.length > 0) {
					app.channelList.channels.sort();
				}
			}

			if (msg.command == '433') {
				// nickname is in use
				if (app.user.lastLegalNick) {
					app.user.nick = app.user.lastLegalNick;
					console.log('reverted to last legal nick');
				} else {
					// set a random nickname
					const seed = Math.floor(Math.random()*100000+1);
					app.user.nick = app.user.nick + '_' + seed;
					app.connection.ws.send('NICK '+app.user.nick);
					console.log('set a random nick');
				}
				
			}

			if (msg.command == '353') {
				// list users in a channel when joining
				
				const users = msg.params[3].split(' ');
				users.sort();
				console.info('users in channel', msg.params[2], users);

				const tab = app.messageWindow.get(msg.params[2]);
				if (tab.title != 'server') {
					tab.users = users;
				}

				if (users.length > 0) {
					/*
					app.messageWindow.addMessage('Users in this channel are: '+users.join(', '), tab.title);
					*/
				} else {
					app.messageWindow.addMessage('No active users in this channel', tab.title);
				}
			}

			if (msg.command == 'JOIN') {
				
				// join a new channel
				const tab = app.messageWindow.get(msg.params[0]);
				if (tab) {
					if (msg.prefix.nick == app.user.nick) {
						// you joined a channel
						app.messageWindow.activate(msg.params[0]);
					} else {
						// somebody else joined a channel
						if(tab.users.indexOf(msg.prefix.nick) === -1) {
							tab.users.push(msg.prefix.nick);
						}
					}
				} else {
					console.info('created new tab for', msg.params[0]);
					app.messageWindow.addTab(msg.params[0], true);
				}

				// update the list as well
				if (msg.prefix.nick == app.user.nick) {
					if (!app.channelList.channels.includes(msg.params[0])) {
						app.channelList.channels.push(msg.params[0]);
						app.channelList.channels.sort();
					}
				}
			}

			if (msg.command == 'PART') {
				// part a channel
				if (msg.prefix.nick == app.user.nick) {
					// you left the channel, close tab
					app.messageWindow.removeTab(msg.params[0]);
				} else {
					// somebody else left the channel
					const tab = app.messageWindow.get(msg.params[0]);
					const index = tab.users.indexOf(msg.prefix.nick);
					tab.users.splice(index, 1);
					tab.users.sort();
				}
			}

			if (msg.command == 'NICK') {
				const newNick = msg.params[0];
				console.warn(msg.prefix.nick, 'changed their nick to', newNick);

				if (msg.prefix.nick == app.user.lastLegalNick) {
					// you changed your own name
					if (app.user.lastLegalNick !== newNick) {
						app.user.lastLegalNick = newNick;
					}

					app.user.nick = newNick;

					app.user.save();
				} else {
					// somebody else changed their name
					// update DMs and channel user lists
					const activeDM = app.dm.conversations.find(conv => conv.title === msg.prefix.nick);

					if (activeDM) {
						activeDM.title = newNick;
					}

					for (const tab of app.messageWindow.tabs) {
						if (tab.users.length > 0) {
							var index = tab.users.indexOf(msg.prefix.nick);
							if (index !== -1) {
								tab.users[index] = newNick;
							}
						}
					}
				}
			}

			// handle QUIT, eg part from all channels correctly
			// todo: maybe notify user with open DMs?
			if (msg.command == 'QUIT') {
				if (msg.prefix.nick != app.user.nick) {

					// remove user from all message tabs
					for (const tab of app.messageWindow.tabs) {
						const pos = tab.users.indexOf(msg.prefix.nick);
						if (pos !== -1) {
							tab.users.splice(pos, 1);
						}
					}
					console.info(msg.prefix.nick, 'logged off.');
				}
			}

			// direct messages eg. PRIVMSG to a single user
			if (msg.command == 'PRIVMSG' && msg.params.length > 0 && !msg.params[0].startsWith('#')) {
				console.info('received a DM from', msg.prefix.nick, 'to', msg.params[0]);
				if (msg.params[0] == app.user.nick) {
					// this is a message TO you
					app.dm.addMessage(msg.prefix.nick, msg);
				} else if (msg.prefix.nick == app.user.nick) {
					// this is a message BY you
					app.dm.addMessage(msg.params[0], msg);
				}
				return;
			}

			// channel privmsg etc
			if (msg.params.length > 0 && msg.params[0].startsWith('#')) {
				targetTab = msg.params[0];	
			}

			let target = app.messageWindow.get(targetTab);
			if (!target) target = app.messageWindow.get('server'); // fallback in case the tab no longer exists
			target.messages.push(msg);
		}
	}
}).mount('#connection');

app.server = createApp({
	'data': function () {
		return {
			'connected': false,
			// 'connectionLock': false,
			'url': 'irc.arnorichter.de',
			'port': '47363'
		}
	},
	'methods': {
		'toggleConnection': function () {
			if (app.connection.ws === null) {
				app.connection.connect();
			} else {
				app.connection.disconnect();
			}
		}
	}
}).mount('#server');

// observe system color mode changes
if (window.matchMedia) {
	window.matchMedia('(prefers-color-scheme: dark)').addListener(e => {
		if (!app.user.colorTheme) {
			const colorTheme = e.matches ? 'dark' : 'light';

			document.documentElement.setAttribute('data-theme', colorTheme);
		}
	});
}

window.addEventListener('beforeunload', function (event) {
	app.connection.disconnect();
});