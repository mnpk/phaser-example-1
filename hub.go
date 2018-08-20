package main

import (
	"encoding/json"
	"log"
)

// Hub maintains the set of active clients and broadcasts msg to the clients.
type Hub struct {
	clients map[*Client]bool

	broadcast     chan []byte
	register      chan *Client
	unregister    chan *Client
	allPlayerInfo chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("client %v registered.", client.id)
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				log.Printf("client %v unregistered.", client.id)
				delete(h.clients, client)
				close(client.send)
			}
		case msg := <-h.broadcast:
			log.Printf("broadcast %v", string(msg))
			for client := range h.clients {
				select {
				case client.send <- msg:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (h *Hub) broadcastAllPlayer() {
	var list []PlayerInfo
	for client := range h.clients {
		list = append(list, *client.info)
	}
	p, _ := json.Marshal(list)
	msg := Message{
		Type:    "allPlayers",
		Payload: string(p),
	}
	b, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
		return
	}
	h.broadcast <- b
}
