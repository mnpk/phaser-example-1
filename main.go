package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

type message struct {
	Type    string `json:"type"`
	Payload string `json:"payload"`
}

type player struct {
	Username string `json:"username"`
	R        int    `json:"r"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

var upgrader = websocket.Upgrader{} // use default options

func handleWs(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer c.Close()

	log.Println("new connection: ")
	p := player{
		Username: "test",
		R:        0,
		X:        300,
		Y:        300,
	}

	pstr, _ := json.Marshal(p)
	log.Println(string(pstr))

	pmsg := message{
		Type:    "newPlayer",
		Payload: string(pstr),
	}
	pmsgbyte, _ := json.Marshal(pmsg)

	c.WriteMessage(1, pmsgbyte)

	for {
		mt, msg, err := c.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}

		log.Printf("recv: %v, %v", mt, string(msg))
		newMsg := message{}
		json.Unmarshal(msg, &newMsg)

		response, _ := json.Marshal(newMsg)
		err = c.WriteMessage(mt, response)
		if err != nil {
			log.Println(err)
			break
		}
	}
}

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	http.HandleFunc("/ws", handleWs)

	log.Println("Listening :3000 ...")
	http.ListenAndServe(":3000", nil)
}
