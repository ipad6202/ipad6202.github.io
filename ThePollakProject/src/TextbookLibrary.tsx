import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../convex/_generated/dataModel";

export function TextbookLibrary() {
  const textbooks = useQuery(api.textbooks.list);
  const currentCheckout = useQuery(api.textbooks.getCurrentCheckout);
  const checkout = useMutation(api.textbooks.checkout);
  const returnBook = useMutation(api.textbooks.returnBook);
  const [selectedBook, setSelectedBook] = useState<Id<"textbooks"> | null>(null);

  const handleCheckout = async (textbookId: Id<"textbooks">) => {
    try {
      const result = await checkout({ textbookId });
      toast.success("Textbook checked out successfully!");
      setSelectedBook(textbookId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to checkout textbook");
    }
  };

  const handleReturn = async (textbookId: Id<"textbooks">) => {
    try {
      await returnBook({ textbookId });
      toast.success("Textbook returned successfully!");
      setSelectedBook(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to return textbook");
    }
  };

  if (textbooks === undefined) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Checkout Status */}
      {currentCheckout && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Currently Checked Out</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">{currentCheckout.title}</p>
              <p className="text-sm text-blue-700">
                Due: {currentCheckout.dueDate ? new Date(currentCheckout.dueDate).toLocaleDateString() : "Unknown"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedBook(currentCheckout._id)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Read PDF
              </button>
              <button
                onClick={() => handleReturn(currentCheckout._id)}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Textbook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {textbooks.map((textbook) => (
          <TextbookCard
            key={textbook._id}
            textbook={textbook}
            onCheckout={handleCheckout}
            onReturn={handleReturn}
            onReadPdf={() => setSelectedBook(textbook._id)}
            hasCurrentCheckout={!!currentCheckout}
          />
        ))}
      </div>

      {textbooks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No textbooks available yet.</p>
        </div>
      )}

      {/* PDF Reader Modal */}
      {selectedBook && (
        <PdfReader
          textbookId={selectedBook}
          onClose={() => setSelectedBook(null)}
        />
      )}
    </div>
  );
}

function TextbookCard({ 
  textbook, 
  onCheckout, 
  onReturn, 
  onReadPdf, 
  hasCurrentCheckout 
}: {
  textbook: any;
  onCheckout: (id: Id<"textbooks">) => void;
  onReturn: (id: Id<"textbooks">) => void;
  onReadPdf: () => void;
  hasCurrentCheckout: boolean;
}) {
  const getStatusColor = () => {
    if (textbook.isCheckedOutByCurrentUser) return "bg-green-100 text-green-800";
    if (textbook.isCheckedOut) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = () => {
    if (textbook.isCheckedOutByCurrentUser) return "Checked out by you";
    if (textbook.isCheckedOut) return `Checked out by ${textbook.checkedOutByUser}`;
    return "Available";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{textbook.title}</h3>
          <p className="text-gray-600">by {textbook.author}</p>
          {textbook.isbn && (
            <p className="text-sm text-gray-500">ISBN: {textbook.isbn}</p>
          )}
        </div>

        {textbook.description && (
          <p className="text-sm text-gray-700 line-clamp-3">{textbook.description}</p>
        )}

        <div className="flex items-center justify-between">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>

          <div className="flex gap-2">
            {textbook.isCheckedOutByCurrentUser ? (
              <>
                <button
                  onClick={onReadPdf}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Read PDF
                </button>
                <button
                  onClick={() => onReturn(textbook._id)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Return
                </button>
              </>
            ) : !textbook.isCheckedOut && !hasCurrentCheckout ? (
              <button
                onClick={() => onCheckout(textbook._id)}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Checkout
              </button>
            ) : (
              <span className="text-sm text-gray-500">
                {hasCurrentCheckout ? "Return current book first" : "Unavailable"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfReader({ textbookId, onClose }: { textbookId: Id<"textbooks">; onClose: () => void }) {
  const pdfAccess = useQuery(api.textbooks.getPdfAccess, { textbookId });

  if (pdfAccess === undefined) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!pdfAccess) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="font-semibold mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You need to checkout this textbook to read it.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h3 className="font-semibold">PDF Reader</h3>
            <p className="text-sm text-gray-600">
              Password: <code className="bg-gray-100 px-1 rounded">{pdfAccess.password}</code>
            </p>
            <p className="text-sm text-gray-600">
              Due: {pdfAccess.dueDate ? new Date(pdfAccess.dueDate).toLocaleDateString() : "Unknown"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        <div className="flex-1 p-4">
          {pdfAccess.pdfUrl ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <h4 className="text-lg font-medium">PDF Ready to View</h4>
              <button
                onClick={() => pdfAccess.pdfUrl && window.open(pdfAccess.pdfUrl, '_blank')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Open PDF in New Tab
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">PDF not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
