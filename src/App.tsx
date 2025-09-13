import React from 'react'
import './App.css'
import whackAvoBg from '../asset/whack-avo-b1-01.svg?v=2'
import avo from '../asset/avo.png'
import hammer from '../asset/whack-hammer-3.svg'

function App() {
  return (
    <div className="app">
      <div className="main-content">
        <div className="table-container">
          <img src={whackAvoBg} alt="Whack Avo" className="whack-avo-image" />
          <div className="avocados-container">
            <img src={hammer} alt="Hammer" className="avocado avocado-1" />
            <img src={hammer} alt="Hammer" className="avocado avocado-2" />
            <img src={hammer} alt="Hammer" className="avocado avocado-3" />
            <img src={hammer} alt="Hammer" className="avocado avocado-4" />
            <img src={hammer} alt="Hammer" className="avocado avocado-5" />
            <img src={hammer} alt="Hammer" className="avocado avocado-6" />
            <img src={hammer} alt="Hammer" className="avocado avocado-7" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
