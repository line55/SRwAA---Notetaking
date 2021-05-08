import React, { Component } from "react"
import {withAuthenticator} from 'aws-amplify-react'
import {Auth, API, graphqlOperation} from 'aws-amplify'
import {createNote, deleteNote, updateNote} from './graphql/mutations'
import {listNotes} from './graphql/queries'
import {onCreateNote, onDeleteNote, onUpdateNote} from './graphql/subscriptions'

//ended up with the classic react component approach
class App extends Component {

  // some simple state
  state={
    id:"",
    note:"", //note string contents
    notes: [],
  }

  //on load, list all the items and subscribe
  componentDidMount() {
    this.getNotes();
    this.getSubscriptions();
  }

  componentWillUnmount() {
    this.createNoteListnener.unsubscribe();
    this.deleteNoteListener.unsubscribe();
    this.updateNoteListener.unsubscribe();
  }

  //and set subscriptions
  getSubscriptions= async () => {
    let user = await Auth.currentUserInfo();
    //is it correct to put it here?
    this.createNoteListnener = API.graphql(graphqlOperation(onCreateNote, {owner: user.username})).subscribe({
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote;
        const prevNotes = this.state.notes.filter(note => note.id !== newNote.id);
        const updatedNotes = [...prevNotes, newNote];
        this.setState({notes: updatedNotes, note: "", id: ""});
      }
    });
    this.deleteNoteListener = API.graphql(graphqlOperation(onDeleteNote, {owner: user.username})).subscribe({
      next: noteData => {
        console.log(noteData);
        const deletedNote = noteData.value.data.onDeleteNote;
        const updatedNotes = this.state.notes.filter(note => note.id !== deletedNote.id);
        this.setState({notes: updatedNotes});
      }
    });
    this.updateNoteListener = API.graphql(graphqlOperation(onUpdateNote, {owner: user.username})).subscribe({
      next: noteData => {
        const {notes} = this.state;
        console.log(noteData);
        const updatedNote = noteData.value.data.onUpdateNote;
        const index = this.state.notes.findIndex(note => note.id === updatedNote.id);
        const updatedNotes = [
          ...notes.slice(0, index),
          updatedNote,
          ...notes.slice(index+1)
        ];
        this.setState({notes: updatedNotes, note: "", id: ""});
      }

    })
  }

  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    this.setState({notes: result.data.listNotes.items});
  }

  //called below from clicking on note <li> , sets the form input
  handleChangeNote = event => {this.setState({note: event.target.value})};


  handleAddNote = async event => {
    const {note} = this.state;
    event.preventDefault() //prevent form from reloading page
    //check if we have an existing note
    if (this.hasExistingNote()) {
      this.handleUpdateNote();
    } else {
      const input = {note};
      await API.graphql(graphqlOperation(createNote, {input}));
      this.setState({note: ''});
    }
  };

  //compare ids
  hasExistingNote = () => {
    const { notes, id}= this.state;
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  }

  handleUpdateNote = async () => {
    const {id, note} = this.state;
    const input  = {id, note};
    await API.graphql(graphqlOperation(updateNote, {input}));
  }

  handleSetNote = ({note, id}) => this.setState({note, id})

  handleDeleteNote = async noteId => {
    const input = { id: noteId };
    await API.graphql(graphqlOperation(deleteNote, {input}));

  }

  render(){
    const { id, notes, note } = this.state;
    
    return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-1">Amplify notetaker</h1>
      {/*Note taker */}
      <form onSubmit={this.handleAddNote} className="mb3">
        <input
          type="text"
          className="pa2 f4"
          placeholder="enter a note"
          onChange={this.handleChangeNote}
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
              <li onClick={()=>this.handleSetNote(item)} className="list pa1 f3">
                {item.note}
              </li>
              <button
                onClick={() => this.handleDeleteNote(item.id)}
                className="bg-transparent bn f4">
                <span>&times; </span>
              </button>
            </div>
          ))}
        </div>
    </div>
 );}
};

export default withAuthenticator(App, { includeGreetings: true});
