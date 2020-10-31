# Javascript IRC client using websockets

A very basic browser-based IRC client that can connect via websocket to eg. UnrealIRCd 5+

Stackoverflow posts like [this one](https://stackoverflow.com/questions/30991814/browser-javascript-app-irc-connection) had me wondering whether it was possible at all, but advances in IRC server software over the years have indeed made it feasible to have an IRC client that runs only in the browser and connects to the server without intermediary server code. This is because IRC servers often deal with the websocket layer themselves nowadays.

I spent some time and tried a few things to make it work, and I think it does. I liked the idea mainly for privacy reasons: there is no middle man between you and the IRC server, which you're connected to via WSS.

It's most certainly not perfect. Take it as a proof of concept. I don't know whether it scales. Or if it has performance issues, warnings or bugs. I tested it for some time and use it myself for communication with friends and students, since many popular messaging solutions have privacy implications. It's working so far and nothing has happened that a browser refresh would not fix.

## Features

- Enter server URL and port in the UI
- Auto-connect to specified channels
- Show available channels
- Display users currently in a channel
- Input history (up/down arrow keys) makes spamming easy (is that even a good thing?)
- (very naive) Vue v3 app
- Tabbed interface
- Support for direct messages between users in a convenient interface (shows the last 6 messages, configurable)
- A decent light and dark theme that auto-switches and has a manual toggle
- Okay HTML makes it possible to style everything yourself, if that's your thing
- Basic support for links and images
- A few Octicons icons here and there, where I thought they were helpful

## Gotchas

- It has to connect over WSS, simple WS does not work
- I depend on the server supporting `echo-message`, `message-tags` and `server-time`
- Only a few basic IRC functions are exposed in the UI
- I only tested this in recent versions of Chrome and Safari
- The design uses `-system-ui` as font, but I only ever see San Francisco, since I'm on Mac/iOS
- I know nothing about NickServ or ChanServ, so this does not support or use either
- Connection errors are mostly silent and invisible, so you don't know what failed

## Installation

Put the files on a server and call the URL. That's it.

Test by connecting to `irc.unrealircd.org` on port `443` and you should see a list of available channels for you to join.

## Feedback and improvements

I welcome input! I don't know much about anything, really, and if somebody finds this and knows how to make it better, let me know, write an issue or PR. If you like this and want to support my open source work, feel free to give back via my Patreon or Paypal. Any amount helps and is appreciated!

## References used

I put these here mainly so I can close a bunch of browser tabs and will later know how I learned about this stuff. Also, if I want to add features later, I will need these links.

### IRC commands

- https://en.wikipedia.org/wiki/List_of_Internet_Relay_Chat_commands
- https://www.mirc.com/help/html/index.html?basic_irc_commands.html
- https://wiki.zandronum.com/IRC:Channel_Modes
- https://modern.ircdocs.horse/
- http://books.gigatux.nl/mirror/irchacks/059600687X/irchks-CHP-13-SECT-2.html
- https://blog.initprogram.com/2010/10/14/a-quick-basic-primer-on-the-irc-protocol/
- https://gist.github.com/xero/2d6e4b061b4ecbeb9f99
- http://www.ircbeginner.com/ircinfo/m-commands.html

### IRC message parsing

- https://github.com/sigkell/irc-message/blob/master/index.js
- https://github.com/crccheck/crc-irc/blob/master/test/test.js
- https://gist.github.com/agrif/2918aebd9cd610f8b99e
- https://dev.twitch.tv/docs/irc/tags
- https://twitchapps.com/tmi/
- https://ircv3.net/specs/extensions/webirc

### Websockets and UnrealIRCd

- https://www.unrealircd.org/docs/WebSocket_support#Using_SSL.2FTLS_with_websocket
- https://dev.to/zaekof/twitch-irc-capability-websocket-help-5728
- https://github.com/kiwiirc/kiwiirc
- https://gist.github.com/oelna/117032d7ecba1b4caae929a136139f12