// Test React component outlines feature
import React, { useState } from 'react';

// Simple functional component
function SimpleComponent() {
  return <div>Hello World</div>;
}

// Component with state
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

// Class component
class ClassComponent extends React.Component {
  render() {
    return <div>Class Component</div>;
  }
}

// Component with props
interface Props {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<Props> = ({ title, children }) => {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
};

// Nested components
const App = () => {
  return (
    <div>
      <SimpleComponent />
      <Counter />
      <ClassComponent />
      <Card title="Test Card">
        <p>This is the content</p>
      </Card>
    </div>
  );
};

export default App;