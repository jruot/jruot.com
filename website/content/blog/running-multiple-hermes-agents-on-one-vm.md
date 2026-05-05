+++
title = "Running Multiple Hermes Agents"
date = 2026-05-01T10:00:00-07:00
draft = false
description = "How to run multiple Hermes Agent instances safely on one VM by isolating each agent with its own Linux user and loginctl lingering."
tags = ["hermes-agent", "ai-agents", "linux", "systemd", "security"]
+++

One simple way to run multiple [Hermes Agent](https://github.com/NousResearch/hermes-agent) instances on one VM is to give each agent its own Linux user.

This lets the operating system enforce the isolation boundary. Each agent gets a separate UID, home directory, file permissions, and process tree. If one agent crashes, misbehaves, or writes unexpected files, the other agents are still protected by normal Linux permissions.

This saves on hosting costs compared to giving each agent its own VM, but the isolation is not as strong.

## The Built-in Option: Profiles

Hermes has a built-in [profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles/) feature that lets you run multiple agents from a single install. Each profile gets its own config, API keys, memory, sessions, skills, gateway, and state database. You create one with `hermes profile create coder` and it immediately gives you a `coder` command alias with its own chat, setup, and gateway.

Profiles are the quickest way to run multiple agents on one machine. They separate agent data at the application level, not the OS level. All profiles share the same UID, home directory, and process namespace. If one agent writes garbage to disk or consumes all the memory, the others have no kernel-level protection.

For trusted agents on a personal machine, profiles are enough. When you want real isolation between agents, especially on a shared server, use separate OS users instead.

## Create One User Per Agent

Create a dedicated OS account for each agent:

```bash
sudo useradd -m -U -s /bin/bash auditron
```

The important part is that each agent has a distinct UID and GID. For example, `auditron` might run as UID `1002`, while another agent runs as UID `1003`. The kernel uses those IDs to decide which files and processes each account can access.

Repeat this for every agent:

```bash
sudo useradd -m -U -s /bin/bash reporter
sudo useradd -m -U -s /bin/bash reviewer
```

Do not add these users to `sudo`, `wheel`, or any other admin group. By design, each agent account should be a regular unprivileged user. The agent can manage its own files and processes, but it cannot install system packages, edit `/etc`, restart system services, or modify the VM.

If you need an agent with sudo access, use a separate master agent account for system administration tasks. This root agent can also manage the other agents, including restarting services, rotating logs, and updating configs, while the regular worker agents stay unprivileged.

## Lock Down Home Directories

Set each agent home directory to mode `700`:

```bash
sudo chmod 700 /home/auditron
sudo chmod 700 /home/reporter
sudo chmod 700 /home/reviewer
```

With `drwx------`, only the owner and root can read, write, or enter the directory. This prevents agents from reading each other's config, logs, credentials, working files, and memory dumps written to disk.

Check the result:

```bash
ls -ld /home/auditron /home/reporter /home/reviewer
```

## Enable Lingering for Each Agent User

Enable lingering for each agent account:

```bash
sudo loginctl enable-linger auditron
sudo loginctl enable-linger reporter
sudo loginctl enable-linger reviewer
```

[Lingering](https://www.freedesktop.org/software/systemd/man/latest/loginctl.html) lets a user's service manager keep running after the user logs out. It also allows user services to start at boot without an interactive login session. This is needed for the Hermes gateway to stay running.

## Ask the Agent to Make the Installer Rootless

Before running Hermes as a service, ask your main root agent to modify `hermes-install.sh` so it works without `sudo`.

Example prompt:

```text
Modify hermes-install.sh so it runs rootlessly as the current user and keeps all files under the user's home directory.
```

Then run the installer inside the agent account:

```bash
sudo -iu auditron
./hermes-install.sh
```

This keeps the agent binaries, config, logs, state, and Python dependencies inside `/home/auditron`. The agent never needs to touch the system OS level. Combined with a non-sudo user and `chmod 700` home permissions, this gives you a practical sandbox for sharing one VM between multiple agents.

Note: this manual step may not be needed in later versions of Hermes. Check the [release notes](https://github.com/NousResearch/hermes-agent/releases) before doing this.

## Keep Secrets Separate

Store each agent's credentials under that agent's home directory:

```text
/home/auditron/.hermes/
/home/reporter/.hermes/
/home/reviewer/.hermes/
```

Then make sure the files are private:

```bash
sudo chmod -R go-rwx /home/auditron
```

I recommend giving each agent its own API keys and credentials. This makes it easier to track token usage per agent and revoke access for one agent without affecting the others.

For more on this and other agent tools, see [AI tools I recommend]({{< relref "/blog/ai-tools-i-recommend" >}}).
