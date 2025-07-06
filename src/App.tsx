import { useEffect, useState } from 'react';
import type { Schema } from '../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';

// 1. --- ADD THE NEW IMPORTS FOR STORAGE ---
import { uploadData, getUrl } from 'aws-amplify/storage';

const client = generateClient<Schema>();

function App() {
  const { user, signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<Schema['Todo']['type']>>([]);

  // 2. --- ADD NEW TYPED STATE FOR FILE HANDLING ---
  // The file can be a File object or null before one is selected.
  const [file, setFile] = useState<File | null>(null);
  // The image URL will be a string.
  const [imageUrl, setImageUrl] = useState<string>('');

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt('Todo content') });
  }

  function deleteTodo(id: string) {
    client.models.Todo.delete({ id });
  }

  // 3. --- ADD NEW FUNCTIONS WITH TYPESCRIPT ---

  // We specify the event type for a file input change.
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  }

  // This function runs when the user clicks the "Upload" button
  async function handleUpload() {
    if (!file) {
      alert('Please select a file first!');
      return;
    }

    try {
      // 'uploadData' sends the file to your S3 bucket.
      const result = await uploadData({
        path: `public/${file.name}`,
        data: file,
      }).result;

      console.log('File uploaded successfully:', result);

      // 'getUrl' retrieves a temporary, secure URL for the file.
      const { url } = await getUrl({ path: result.path });
      setImageUrl(url.toString());
      console.log('Image URL:', url);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  }

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s todos</h1>
      <button onClick={createTodo}>+ new</button>
      <ul>
        {todos.map((todo) => (
          <li onClick={() => deleteTodo(todo.id)} key={todo.id}>
            {todo.content}
          </li>
        ))}
      </ul>
      <hr />

      {/* 4. --- ADD NEW UI ELEMENTS (NO CHANGE NEEDED HERE) --- */}
      <h2>File Uploader</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload File</button>

      {/* This will only display the image after it has been uploaded */}
      {imageUrl && (
        <div>
          <h3>Uploaded Image:</h3>
          <img src={imageUrl} alt="Uploaded" style={{ width: '300px' }} />
        </div>
      )}

      <hr />
      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
