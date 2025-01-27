---
title: Designing a multiplayer framework with good DX.
header: 
date: 2025-01-27
---

*This post was created around 2 months ago*
# Introduction
For the past month or so, I've been working on a TCP (hopefully UDP in the future) framework in rust for the purpose of easing the process of creating fast and reliable multiplayer games. It's far from finished, but there's some stuff to look at and play around with, so I thought I'd write about the steps taken to get here.

If you wanna download the framework and mess around with it yourself, or you wanna look at the guts to propose refactoring, review my questionable code, propose a cool name (since the placeholder name is literally "multiplayerproj") or use the project as inspiration. The repository is available here: https://github.com/izzyn/multiplayerproj

# Why did I do this?
So I've been interested in networking since I made [my first multiplayer project](https://github.com/izzyn/Multiplayer-Hackgame) and finding some way to include multiplayer functionality in all my personal game projects has been a really fun process over the past few years. But I've always thought it was more fun to work from the ground-up doing raw TCP than working with frameworks like Godot's high level multiplayer framework (Even though it's really really good if you want to make simple multiplayer video games without much hassle.). So it should come as no surprise that the idea of writing my own multiplayer framework came pretty naturally as I got more knowledgeable about the topic.

I've also wanted an excuse to write a proper project with rust, since it's been a fun language to play around with and I like its principles. Also having the strict requirement of "the server should never crash" was a pretty strong motivator to use a language where all error handling is mandatory. 
# The Process
I began by thinking about the developer experience of the framework (The goal was "easy-to-use") as well as the protocol for formatting the data.

## The formatting
For formatting of data, I went with a simple model of simply assigning certain bytes to certain types, throwing an error if the type assigned byte is invalid and parsing the rest of the bytes depending on what the remote machine states they're sending, with the necessary safety checks to make sure that no weird buffer shenanigans can happen if the client jumbles around their type values (it would simply cause the server to send the client an error). Also mandating length information  and the like for types which have variable length.

## Design

### The idea
Design wise I've always been a fan of RPC's (remote procedural calls), essentially, you tie a function on one client to one function on the server, when the client executes the function, the server will execute their corresponding function. It allows for a safe way to execute logic remotely, by having the server/client decide what logic can be activated by the other peer.

What I disliked about this process however, was how difficult it was to work with different rooms/lobbies in this way, you'd have to connect and move around references in ways that weren't ideal.

What I thus came up with was a slightly modified version of the RPC model, a "connection" model. Essentially what this means is that the server can connect a signal ID (which would be a unique number), to a function, this function can be a method that resides within an object, or a free function. This really eases the process of working with lobbies, rooms, switching player characters, etc. since every time the client would want to switch what their request affects, you simply reconnect the function on the server side.

Actually implementing this in a way that feels nice to write was a very interesting challenge.
### The gritty details
The idea is that the end user would only have to do 3 simple steps  in order to call their function from a signal.
1. Add a decorator to your desired function.
2. Connect it on the side you want it to be called.
3. Send the correct signal.

Problem? Writing decorators is an interesting experience, and handling type-safety whilst receiving arbitrary data from a client is difficult. Let's explain what I mean by that.

Decorators (or as they are called in rust "attribute macros"), are essentially macros that take in the AST (abstract syntax tree) of the function you applied the decorator to, and return an AST of the tokens you want to take their place.

What we then want to do with this decorator is to: Create another function that functions identically to the original, but takes in parsed data from the client (which can be any type), do type checking on it, and call the original function with the checked data (providing there weren't any data that was incorrect). Otherwise we throw an error that is handled within the framework's data parsing loop.

We then want the connection function to be a macro which takes in the original function which you want to use and an ID, and calls a function that adds the network-compatible function counterpart into a hash table that is linked with the provided ID. 

Calling the function themselves is simply a matter of parsing the given data, finding the signal, and sending the rest of the data as arguments to the signal and just throw an error if the data we receive doesn't correspond to the arguments we want to take.

# The Result
The result as it stands now, whilst impressive is not actually more ergonomic than what it aimed to replace (that being RPC), but that issue can be solved with a few tweaks and improvements.

So what is the experience of using this framework today? Let's go through the process of sending a function with this framework.

## Using the framework
First of all, we create a basic TCP project using tokio or similar, I'll be using tokio for the example. I won't go through how to create such a main communication loop. But you can find great explanations on how to do this in the tokio docs, or from [this blog post](https://blog.graysonhead.net/posts/rust-tcp/).

So you have your main communication loop, and now you want to use it to call a function remotely from one peer to the next. Let's call this function ``test``.

```rust
// client/src/main.rs

fn test(a: &str, b: i32) {
    println!("{}{}", a, b);
}
```

To make this function remotely executable by the framework, we simply add the ``#[netfunc]`` decorator.

```rust
// client/src/main.rs

#[netfunc]
fn test(a: &str, b: i32) {
    println!("{}{}", a, b);
}
```

Now we have our function, and we have signified it should be connectable, nice.

Next we want to actually connect it and call it.
```rust
// client/src/main.rs

async fn handle_connection(stream: TcpStream) -> Result<(), Box<dyn Error>> {
    let mut client = shared::clients::Client::new();

    shared::connect!(2, client, test);
	//...
}
```

We have now created the client object, and connected it. So how do we call it, and how do we make sure it gets called?

First we need to send the signal to call the function on the server side. We do that within the server side like this.

```rust
//server/src/main.rs

//Within the network function handler, inside the read clause.
client.send(
2,
&[
	encode_string("hello wassup!".to_string())?,
	encode_i32(32).to_vec(),
]
.to_vec()
.concat(),
);
client.push_input();
match stream.try_write(&client.inputbffr) {
	Ok(n) => {
		println!("Wrote {} bytes", n);
	}
	//Handle errors...
}

```

First we say that we want to ``send`` signal ``2`` (which corresponds to the ``test`` function as declared earlier), we then use the framework provided `encode` functions to encode the types such that they can be sent and parsed correctly.

We then push all of our signals we decided to send above. This pushes all the queued messages we want to send into the `client.inputbuffr` until the buffer is full. Then we send it!

So how do we receive this data and actually get our function called?
```rust
//client/src/main.rs

//In our read loop
match stream.try_read(&mut client.outputbffr) {
	Ok(n) => {
		match client.exec_data(parse(&client.outputbffr)?) {
			Err(e) => {
				println!("{e}");
				break;
			}
			Ok(()) => break,
		}
	}

```

First we read into the `client.outputbffr`, then we use the framework provided `parse` function to parse all of the data according to how it was encoded, and then we tell the client to execute the signals within with the `client.exec_data` function! And that's it!

# Closing thoughts
This project has been a whole lot of fun, not only because it deals with a lot of interesting problems but also because it de-mystified a lot of the process behind making a framework that's both powerful and easy to use, which is a skill that I'm yearning to learn eventually. While the project certainly isn't in a state where I would recommend it as the go-to solution for your high-performance easy-to-use networking needs, the foundations have been placed and I'm quite proud of the progress made so-far.

Corrections? Comments? Questions? Pictures of cool cats? Want to talk to me about something you think I'd find cool? Send me a message at **contact@izzyn.dev**
