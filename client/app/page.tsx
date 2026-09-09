import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import FileUploadComponent from "./components/file-upload";
import ChatWorkspace from "./components/chat-workspace";

export default function Home() {
  return (
    <div className="w-full min-h-[calc(100vh-65px)] flex">
      <Show
        when="signed-in"
        fallback={
          <div className="w-full flex flex-col items-center justify-center gap-6 p-8 text-center bg-gray-50">
            <div className="max-w-md space-y-3">
              <h1 className="text-3xl font-bold text-gray-900">
                PDF RAG Assistant
              </h1>
              <p className="text-gray-600">
                Sign in to upload your PDF documents and start asking questions using AI vector search.
              </p>
            </div>

            <div className="flex gap-4">
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition">
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-medium px-5 py-2.5 rounded-lg transition">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </div>
        }
      >
        {/* Left Upload Panel (30vw) */}
        <div className="w-[30vw] min-h-full p-4 flex justify-center items-center border-r border-gray-200">
          <FileUploadComponent />
        </div>

        {/* Right Chat Panel (70vw) */}
        <div className="w-[70vw] min-h-full">
          <ChatWorkspace />
        </div>
      </Show>
    </div>
  );
}