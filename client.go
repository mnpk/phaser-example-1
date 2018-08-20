package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Message ...
type Message struct {
	Type    string
	Payload string
}

// PlayerInfo ...
type PlayerInfo struct {
	ID string
	X  float32
	Y  float32
	R  float32
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
	id   int
	info *PlayerInfo
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		p, _ := json.Marshal(c.info)
		c.broadcast(&Message{
			Type:    "exitPlayer",
			Payload: string(p),
		})
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		msg := Message{}
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		log.Printf("handleMessage from client %v: %v", c.id, msg)
		c.handleMessage(&msg)
	}
}

func (c *Client) response(msg *Message) {
	b, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
		return
	}
	c.send <- b
}

func (c *Client) broadcast(msg *Message) {
	b, err := json.Marshal(msg)
	if err != nil {
		log.Println(err)
		return
	}
	c.hub.broadcast <- b
}

func (c *Client) handleMessage(msg *Message) {
	switch msg.Type {
	case "enterPlayer":
		info := PlayerInfo{}
		err := json.Unmarshal([]byte(msg.Payload), &info)
		if err != nil {
			log.Println(err)
			break
		}
		c.info = &PlayerInfo{
			ID: info.ID,
			X:  float32(rand.Intn(600) + 100),
			Y:  float32(rand.Intn(400) + 100),
			R:  0,
		}
		p1, _ := json.Marshal(c.info)
		c.broadcast(&Message{
			Type:    "newPlayer",
			Payload: string(p1),
		})

		c.hub.broadcastAllPlayer()

	case "playerMovement":
		info := PlayerInfo{}
		err := json.Unmarshal([]byte(msg.Payload), &info)
		if err != nil {
			log.Println(err)
			break
		}

		c.info.X = info.X
		c.info.Y = info.Y
		c.info.R = info.R

		c.broadcast(msg)

	default:
		log.Println("invalid message type")
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// the hub closed channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(msg)

			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
