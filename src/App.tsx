import { useEffect, useState } from 'react';
import type { Schema } from '../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl, remove } from 'aws-amplify/storage';

const client = generateClient<Schema>();

// This defines what our Todo object will look like in the state, including the temporary imageUrl
type TodoWithImageUrl = Schema['Todo']['type'] & { imageUrl?: string };

function App() {
  const { user, signOut } = useAuthenticator();
  const [todos, setTodos] = useState<Array<TodoWithImageUrl>>([]);

  // State for the new todo form
  const [newTodoContent, setNewTodoContent] = useState('');
  const [newTodoFile, setNewTodoFile] = useState<File | null>(null);

  // This useEffect now fetches todos AND gets the image URL for each one
  useEffect(() => {
    const sub = client.models.Todo.observeQuery().subscribe({
      next: async (data) => {
        const todosWithImages = await Promise.all(
          data.items.map(async (todo) => {
            if (todo.imageKey) {
              const { url } = await getUrl({ path: todo.imageKey });
              return { ...todo, imageUrl: url.toString() };
            }
            return { ...todo, imageUrl: '' };
          })
        );
        setTodos(todosWithImages);
      },
    });
    return () => sub.unsubscribe();
  }, []);

  // This is the combined function to create a todo and upload its image
  async function createTodoWithImage() {
    if (!newTodoContent) {
      alert('Please enter some content for your todo.');
      return;
    }

    let imageKey: string | undefined = undefined;

    // STEP A: If a file is selected, upload it to S3 first
    if (newTodoFile) {
      try {
        // We use a 'protected' path so only the logged-in user can access it.
        const path = `protected/${user?.userId}/${Date.now()}-${
          newTodoFile.name
        }`;
        const result = await uploadData({ path, data: newTodoFile }).result;
        imageKey = result.path; // Save the file's unique path
        console.log('File uploaded successfully:', imageKey);
      } catch (error) {
        console.error('Error uploading file:', error);
        return; // Stop if the upload fails
      }
    }

    // STEP B: Create the Todo in the database, including the imageKey
    try {
      await client.models.Todo.create({
        content: newTodoContent,
        imageKey: imageKey, // This links the todo to the S3 object
      });
      console.log('Todo created successfully!');
      // Reset the form fields after successful creation
      setNewTodoContent('');
      setNewTodoFile(null);
      // Clear the file input visually
      (document.getElementById('file-input') as HTMLInputElement).value = '';
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  }

  async function deleteTodo(todo: TodoWithImageUrl) {
    // If there's an image, delete it from S3 first
    if (todo.imageKey) {
      try {
        await remove({ path: todo.imageKey });
      } catch (error) {
        console.error('Error deleting image from S3:', error);
      }
    }
    // Then delete the todo record from the database
    await client.models.Todo.delete({ id: todo.id });
  }

  return (
    <main>
      <h1>Bienvenido, {user?.signInDetails?.loginId}</h1>

      <div
        style={{
          border: '1px solid #ccc',
          padding: '10px',
          margin: '10px 0',
          borderRadius: '5px',
        }}
      >
        <h3>Addiciona un Texto y una imagen</h3>
        <input
          type="text"
          placeholder="Todo content..."
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
        />
        <input
          id="file-input"
          type="file"
          onChange={(e) =>
            setNewTodoFile(e.target.files ? e.target.files[0] : null)
          }
        />
        <button onClick={createTodoWithImage}>+ Crea Nueva Historia</button>
      </div>

      <h2>Mis Historias</h2>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} style={{ marginBottom: '10px', listStyle: 'none' }}>
            {todo.content}
            {/* If the todo has an image URL, display it */}
            {todo.imageUrl && (
              <img
                src={todo.imageUrl}
                alt="todo visual"
                style={{
                  height: '50px',
                  marginLeft: '10px',
                  verticalAlign: 'middle',
                }}
              />
            )}
            <button
              onClick={() => deleteTodo(todo)}
              style={{ marginLeft: '20px', color: 'red' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}

export default App;
