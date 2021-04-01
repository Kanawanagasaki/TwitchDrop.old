using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TwitchLib.Client;
using TwitchLib.Client.Models;
using TwitchLib.Communication.Clients;
using TwitchLib.Communication.Models;

namespace ru.Kanawanagasaki.TwitchDrop.Logic
{
    public abstract class WebClient
    {
        private static uint _aiId = 10000;
        protected static Dictionary<string, uint> Sessions = new Dictionary<string, uint>();

        public uint Id { get; private set; } = 0;
        public bool IsConnected { get; protected set; }
        public string ChannelName { get; protected set; }

        public delegate void InfoReceived(WebClient client, string command, string[] args);
        public event InfoReceived OnInfoReceived;
        public delegate void ErrorReceived(WebClient client, string command, int code, string error);
        public event ErrorReceived OnErrorReceived;
        public delegate void ConnectionClosed(WebClient client);
        public event ConnectionClosed OnConnectionClose;
        
        protected HttpContext Context;

        private ConcurrentQueue<Func<Task>> _actions = new ConcurrentQueue<Func<Task>>();

        protected string SessionUid;

        public WebClient(HttpContext context)
        {
            Context = context;
            Id = _aiId++;
            IsConnected = true;

            if(context.Request.Cookies.ContainsKey("DropSession"))
                SessionUid = context.Request.Cookies["DropSession"];
            else
            {
                SessionUid = Guid.NewGuid().ToString().Replace("-","");
                context.Response.Cookies.Append("DropSession", SessionUid);
            }
        }

        public virtual uint? GetLastEventId()
        {
            if(Sessions.ContainsKey(SessionUid)) return Sessions[SessionUid];
            else return null;
        }

        public void AddAsyncAction(Func<Task> action)
        {
            _actions.Enqueue(action);
        }

        public abstract Task Init();

        public virtual async Task Run()
        {
            while(IsConnected)
            {
                while(!_actions.IsEmpty)
                {
                    if(_actions.TryDequeue(out var action))
                        await action();
                }
                this.OnTick();
                Thread.Sleep(1000);
            }
        }

        protected virtual void OnTick() {}

        protected void OnInfo(string command, string[] args)
        {
            OnInfoReceived?.Invoke(this, command, args);
        }

        protected void OnError(string command, int code, string message)
        {
            OnErrorReceived?.Invoke(this, command, code, message);
        }

        protected void OnClose()
        {
            OnConnectionClose?.Invoke(this);
        }

        public async Task SendInfoAsync(uint? id, string command, string args)
        {
            string message = $"info {command}";
            if (!string.IsNullOrWhiteSpace(args)) message += " " + args.Trim();
            await SendMessageAsync(id, message);
        }

        public async Task SendErrorAsync(uint? id, string command, int code, string error)
        {
            await SendMessageAsync(id, $"error {command} {code} {error}");
        }

        protected abstract Task SendMessageAsync(uint? id, string message);

        public abstract Task<string> ReadChannel();
        public abstract void Close();
    }
}
