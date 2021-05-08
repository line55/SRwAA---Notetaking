import React, { useState, useEffect } from "react"
import {withAuthenticator} from 'aws-amplify-react'
import {Auth, API, graphqlOperation} from 'aws-amplify'
import {createNote, deleteNote, updateNote} from './graphql/mutations'
import {listNotes} from './graphql/queries'
import {onCreateNote, onDeleteNote, onUpdateNote} from './graphql/subscriptions'

//ended up with the classic react component approach
const App =() => {

  const [id, setId] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    //up here so we can clean em up later
    let createNoteListener, deleteNoteListener, updateNoteListener;

    const init = async() => {
      const currentUser = await Auth.currentUserInfo();

      getNotes();

      createNoteListener = API.graphql(graphqlOperation(onCreateNote, {owner: currentUser.username})).subscribe({
        next: noteData => {
          const newNote = noteData.value.data.onCreateNote;
          setNotes(prevNotes => {
            const oldNotes = prevNotes.filter(note => note.id !== newNote.id)
            const updatedNotes = [...oldNotes, newNote];
            return updatedNotes;
          })
          setNote("");
        }
      });
      deleteNoteListener = API.graphql(graphqlOperation(onDeleteNote, {owner: currentUser.username})).subscribe({
        next: noteData => {
          const deletedNote = noteData.value.data.onDeleteNote;
          setNotes(prevNotes => {
            const updatedNotes = prevNotes.filter(note => note.id !== deletedNote.id);
            return updatedNotes;
          })
        }
      });
      updateNoteListener = API.graphql(graphqlOperation(onUpdateNote, {owner: currentUser.username})).subscribe({
        next: noteData => {
          const updatedNote = noteData.value.data.onUpdateNote;
          setNotes(prevNotes => {
            const index = prevNotes.findIndex(note => note.id === updatedNote.id);
            const updatedNotes = [
              ...prevNotes.slice(0, index),
              updatedNote,
              ...prevNotes.slice(index+1)
            ];
            return updatedNotes;
          })
          setNote("")
          setId("")
        }
      })
    }
    init();


    //this return will mimic the unmount
     return () => {
       createNoteListener.unsubscribe();
       deleteNoteListener.unsubscribe();
       updateNoteListener.unsubscribe();
    }
  }, []); //empty array to only run on mount, not update

  const getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    setNotes(result.data.listNotes.items);
  }

  //called below from clicking on note <li> , sets the form input
  const handleChangeNote = event => {setNote(event.target.value)};

  const handleAddNote = async event => {
    event.preventDefault() //prevent form from reloading page
    //check if we have an existing note
    if (hasExistingNote()) {
      handleUpdateNote();
    } else {
      const input = {note};
      await API.graphql(graphqlOperation(createNote, {input}));
    }
  };

  //compare ids
  const hasExistingNote = () => {
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  }

  const handleUpdateNote = async () => {
    const input  = {id, note};
    await API.graphql(graphqlOperation(updateNote, {input}));
  }

  const handleSetNoteForUpdate = ({note, id}) => {
    setNote(note);
    setId(id);
  }

  const handleDeleteNote = async noteId => {
    const input = { id: noteId };
    await API.graphql(graphqlOperation(deleteNote, {input}));
  }

    return (
      <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
        <h1 className="code f2-1">Amplify notetaker</h1>
        {/*Note taker */}
        <form onSubmit={handleAddNote} className="mb3">
          <input
            type="text"
            className="pa2 f4"
            placeholder="enter a note"
            onChange={handleChangeNote}
            value={note}
          />
          <button className="pa2 f4"
                  type="submit">
            {id ? "Update Note": "Add note"}
          </button>
        </form>
        { /*Notes list*/ }
        <div>
          {notes.map(item => (
            <div key={item.id} className="flex items-center">
              <li onClick={()=>handleSetNoteForUpdate(item)} className="list pa1 f3">
                {item.note}
              </li>
              <button
                onClick={() => handleDeleteNote(item.id)}
                className="bg-transparent bn f4">
                <span>&times; </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
}

export default withAuthenticator(App, { includeGreetings: true});
