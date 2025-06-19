// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Braille configuration
const keyToDot = {
  'd': 0, 'w': 1, 'q': 2, 'k': 3, 'o': 4, 'p': 5
};

const letterToPattern = {
  'a': '100000', 'b': '110000', 'c': '100100', 'd': '100110',
  'e': '100010', 'f': '110100', 'g': '110110', 'h': '110010',
  'i': '010100', 'j': '010110', 'k': '101000', 'l': '111000',
  'm': '101100', 'n': '101110', 'o': '101010', 'p': '111100',
  'q': '111110', 'r': '111010', 's': '011100', 't': '011110',
  'u': '101001', 'v': '111001', 'w': '010111', 'x': '101101',
  'y': '101111', 'z': '101011'
};

// Sample dictionary
const dictionary = [
  "hello", "world", "braille", "system", "react", 
  "javascript", "task", "thinkerbell", "correction",
  "interface", "suggestion", "keyboard", "input",
  "auto", "correct", "visual", "impairment", "accessibility"
];

// Trie Node
class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

// Trie Implementation
class Trie {
  constructor() {
    this.root = new TrieNode();
    this.deletionCost = 3;
  }

  insert(word) {
    let node = this.root;
    for (const char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
  }

  search(inputPatterns, maxSuggestions = 5) {
    const n = inputPatterns.length;
    if (n === 0) return [];
    
    // Initial DP state: [0, 3, 6, ...]
    const initialDp = Array(n + 1).fill().map((_, i) => i * this.deletionCost);
    
    const suggestions = [];
    this._search(this.root, '', initialDp, inputPatterns, suggestions);
    
    // Sort by cost and return top suggestions
    return suggestions
      .sort((a, b) => a.cost - b.cost)
      .slice(0, maxSuggestions);
  }

  _search(node, currentWord, dp, inputPatterns, suggestions) {
    const n = inputPatterns.length;
    
    // Check if we're at a word end
    if (node.isEnd) {
      const totalCost = Math.min(...dp.map((cost, j) => 
        cost + this.deletionCost * (n - j)
      ));
      suggestions.push({ word: currentWord, cost: totalCost });
    }

    // Explore children
    for (const [char, childNode] of Object.entries(node.children)) {
      const pattern = letterToPattern[char];
      if (!pattern) continue;

      const newDp = [dp[0] + this.deletionCost];
      
      for (let j = 1; j <= n; j++) {
        const hammingCost = this._hammingDistance(pattern, inputPatterns[j - 1]);
        newDp[j] = Math.min(
          dp[j] + this.deletionCost,       // Delete char in dict
          newDp[j - 1] + this.deletionCost, // Insert extra input
          dp[j - 1] + hammingCost           // Match/substitute
        );
      }
      
      this._search(childNode, currentWord + char, newDp, inputPatterns, suggestions);
    }
  }

  _hammingDistance(pattern1, pattern2) {
    let distance = 0;
    for (let i = 0; i < 6; i++) {
      if (pattern1[i] !== pattern2[i]) distance++;
    }
    return distance;
  }
}

function App() {
  const [currentKeys, setCurrentKeys] = useState([]);
  const [groups, setGroups] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const timerRef = useRef(null);
  const trieRef = useRef(new Trie());

  // Initialize dictionary
  useEffect(() => {
    dictionary.forEach(word => trieRef.current.insert(word));
  }, []);

  // Convert key group to pattern
  const keysToPattern = (keys) => {
    const pattern = Array(6).fill('0');
    // Handle both array and string input
    const keysArray = Array.isArray(keys) ? keys : keys.split('');
    keysArray.forEach(key => {
      if (keyToDot.hasOwnProperty(key)) {
        pattern[keyToDot[key]] = '1';
      }
    });
    return pattern.join('');
  };

  // Handle key presses
  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();
    
    if (keyToDot.hasOwnProperty(key) && !currentKeys.includes(key)) {
      // Add to current keys and reset timer
      setCurrentKeys(prev => [...prev, key]);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        if (currentKeys.length > 0) {
          const sortedKeys = [...currentKeys].sort();
          setGroups(prev => [...prev, sortedKeys]);
          setCurrentKeys([]);
        }
      }, 200);
    } else if (key === 'backspace') {
      // Remove last group
      setGroups(prev => prev.slice(0, -1));
    } else if (key === ' ') {
      // Add space
      setGroups(prev => [...prev, 'space']);
    }
  };

  // Generate suggestions when groups change
  useEffect(() => {
    const inputPatterns = groups
      .filter(group => group !== 'space')
      .map(keysToPattern);
    
    if (inputPatterns.length > 0) {
      const results = trieRef.current.search(inputPatterns);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, [groups]);

  return (
    <div className="app" tabIndex="0" onKeyDown={handleKeyDown}>
      <h1>Braille Auto-Correct System</h1>
      
      <div className="input-container">
        <div className="current-input">
          <h2>Current Input:</h2>
          <div className="groups-display">
            {groups.map((group, i) => (
              <span key={i} className="group">
                {group === 'space' ? '␣' : group.join('')}
              </span>
            ))}
            {currentKeys.length > 0 && (
              <span className="group active">{currentKeys.join('')}</span>
            )}
          </div>
        </div>
        
        <div className="instructions">
          <p>Use keys: D, W, Q, K, O, P for Braille dots</p>
          <p>Space: Add space | Backspace: Delete last character</p>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions">
          <h2>Suggestions:</h2>
          <ul>
            {suggestions.map((suggestion, i) => (
              <li key={i} onClick={() => {
                // Auto-complete when suggestion is clicked
                setGroups(suggestion.word.split('').map(char => [char]));
                setSuggestions([]);
              }}>
                {suggestion.word}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="key-mapping">
        <h3>Braille Key Mapping:</h3>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Dot</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(keyToDot).map(([key, dot]) => (
              <tr key={key}>
                <td>{key.toUpperCase()}</td>
                <td>{dot + 1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;