import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt, faPaperclip } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

function App() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/events')
      .then(response => setEvents(response.data))
      .catch(error => console.error('Error fetching events:', error));
  }, []);

  useEffect(() => {
    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
    setSelectedDateEvents(filteredEvents);
  }, [date, events]);

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  const handleAddEvent = (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (newEventTitle.trim()) {
      formData.append('title', newEventTitle);
    }
    if (imageFile) {
      formData.append('image', imageFile);
    }
    formData.append('date', date.toISOString().split('T')[0]);

    if (!newEventTitle.trim() && !imageFile) {
      alert('Please provide either an event title or an image.');
      return;
    }

    axios.post('http://localhost:5000/events', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    .then(response => {
      setEvents([...events, response.data]);
      setNewEventTitle('');
      setImageFile(null);
      setImagePreview(null);
    })
    .catch(error => console.error('Error adding event:', error));
  };

  const handleDeleteEvent = (id) => {
    axios.delete(`http://localhost:5000/events/${id}`)
      .then(() => {
        setEvents(events.filter(event => event._id !== id));
        setSelectedDateEvents(selectedDateEvents.filter(event => event._id !== id));
      })
      .catch(error => console.error('Error deleting event:', error));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Calendar</h1>
      <div className="flex flex-col md:flex-row justify-between mb-8">
        <div className="w-full md:w-1/2 mb-6 md:mb-0">
          <Calendar
            onChange={handleDateChange}
            value={date}
            className="w-full max-w-md mx-auto bg-white border border-gray-300 rounded-lg shadow-md"
            tileContent={({ date, view }) => {
              if (view === 'month') {
                const eventsOnThisDay = events.filter(event => 
                  new Date(event.date).toDateString() === date.toDateString()
                );
                return eventsOnThisDay.map(event => 
                  <div key={event._id} className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                );
              }
            }}
          />
        </div>
        <div className="w-full md:w-5/12 bg-gray-100 p-6 rounded-lg shadow-md">
           
          <form onSubmit={handleAddEvent} className="space-y-4">
             
            <div className="flex items-center space-x-2">
              <label htmlFor="image-upload" className="cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FontAwesomeIcon icon={faPaperclip} className="mr-2" />
                Add event to calender 
              </label>
              <input
                id="image-upload"
                type="file"
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="max-w-full h-auto rounded-md" />
            )}
            <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200">
              Add Event
            </button>
          </form>
        </div>
      </div>
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Events for {date.toDateString()}</h2>
        <div className="space-y-4">
          {selectedDateEvents.map(event => (
            <div key={event._id} className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
              <div className="flex items-center space-x-4">
                {event.image && <img src={`http://localhost:5000${event.image}`} alt="Event" className="w-12 h-12 object-cover rounded" />}
                <div>
                  <h3 className="font-semibold">{event.title}</h3>
                </div>
              </div>
              <button onClick={() => handleDeleteEvent(event._id)} className="text-red-500 hover:text-red-700">
                <FontAwesomeIcon icon={faTrashAlt} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;