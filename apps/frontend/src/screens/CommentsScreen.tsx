import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
}

interface CommentsScreenProps {
  route: {
    params: {
      articleId: string;
      title: string;
    };
  };
}

const mockComments: Comment[] = [
  {
    id: '1',
    author: 'John D.',
    content: 'This is a very balanced take on the issue. I appreciate the multiple perspectives presented.',
    timestamp: '2 hours ago',
    likes: 12,
    replies: 3,
  },
  {
    id: '2',
    author: 'Sarah M.',
    content: 'I disagree with some of the conclusions, but the sources are solid. Good journalism.',
    timestamp: '3 hours ago',
    likes: 8,
    replies: 1,
  },
  {
    id: '3',
    author: 'Mike R.',
    content: 'Finally, a news app that shows different viewpoints! This is exactly what we need.',
    timestamp: '4 hours ago',
    likes: 24,
    replies: 0,
  },
];

const CommentsScreen: React.FC<CommentsScreenProps> = ({route}) => {
  const {articleId, title} = route.params;
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState('');

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        author: 'You',
        content: newComment.trim(),
        timestamp: 'Just now',
        likes: 0,
        replies: 0,
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  const handleLike = (commentId: string) => {
    setComments(comments.map(comment => 
      comment.id === commentId 
        ? {...comment, likes: comment.likes + 1}
        : comment
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <Text style={styles.articleTitle} numberOfLines={2}>{title}</Text>
        </View>

        <ScrollView style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentHeader}>
                <Text style={styles.authorName}>{comment.author}</Text>
                <Text style={styles.timestamp}>{comment.timestamp}</Text>
              </View>
              <Text style={styles.commentContent}>{comment.content}</Text>
              <View style={styles.commentActions}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleLike(comment.id)}>
                  <Ionicons name="thumbs-up-outline" size={16} color="#666" />
                  <Text style={styles.actionText}>{comment.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={16} color="#666" />
                  <Text style={styles.actionText}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Add a comment..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.submitButton, !newComment.trim() && styles.submitButtonDisabled]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim()}>
            <Text style={[styles.submitButtonText, !newComment.trim() && styles.submitButtonTextDisabled]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  commentsList: {
    flex: 1,
    padding: 20,
  },
  commentItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 14,
    color: '#999',
  },
  commentContent: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
    marginBottom: 12,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  submitButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
});

export default CommentsScreen;
