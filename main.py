from flask import Flask, request, jsonify, render_template, send_from_directory
import random
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_client_id import GOOGLE_CLIENT_ID
import os
from functools import wraps
from flask_cors import CORS
from flask import redirect


# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY") or os.urandom(24)

# Configuration
GOOGLE_CLIENT_ID = "163432350116-91ir18aebdieglo0gcqb9krcgcfcgr9p.apps.googleusercontent.com"


# Session configuration
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)

# Enable CORS if needed
CORS(app, supports_credentials=True)

# Initialize Firebase
def initialize_firebase():
    cred = credentials.Certificate("firebase_config.json")
    firebase_admin.initialize_app(cred)
    return firestore.client()

db = initialize_firebase()

# Flask-Login setup
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.session_protection = "strong"

class User(UserMixin):
    def __init__(self, id_, email, name, picture=None):
        self.id = id_
        self.email = email
        self.name = name
        self.picture = picture

    def get_id(self):
        return str(self.id)

    @staticmethod
    def get(user_id):
        user_ref = db.collection('users').document(user_id).get()
        if user_ref.exists:
            user_data = user_ref.to_dict()
            return User(
                id_=user_id,
                email=user_data['email'],
                name=user_data.get('name'),
                picture=user_data.get('picture')
            )
        return None

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)


@login_manager.unauthorized_handler
def unauthorized_callback():
    # For API requests, return JSON 401 instead of redirecting
    if request.path.startswith("/api/"):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    return redirect(f"/login?next={request.path}")

# Helper Functions
def validate_game_input(terms, definitions):
    if len(terms) != len(definitions):
        return False, "Number of terms and definitions must match"
    if not terms or not definitions:
        return False, "Terms and definitions cannot be empty"
    return True, None

def create_game_record(terms, definitions):
    if not current_user.is_authenticated:
        return None, None, "User not authenticated"

    game_ref = db.collection('games').document()
    shuffled_defs = random.sample(definitions, len(definitions))
    game_ref.set({
        'terms': terms,
        'definitions': shuffled_defs,
        'created_at': datetime.now(),
        'completed': False,
        'user_id': current_user.id
    })
    return game_ref, shuffled_defs, None

def save_flashcard_set(terms, definitions, title, game_id):
    if not current_user.is_authenticated:
        return None, "User not authenticated"

    flashcard_ref = db.collection('saved_flashcards').document()
    flashcard_ref.set({
        'title': title,
        'terms': terms,
        'definitions': definitions,
        'created_at': datetime.now(),
        'game_id': game_id,
        'last_updated': datetime.now(),
        'user_id': current_user.id
    })
    return flashcard_ref, None

def save_game_results(game_id, time_seconds, correct, total):
    if not current_user.is_authenticated:
        return False, "User not authenticated"

    game_ref = db.collection('games').document(game_id)
    game = game_ref.get()

    if not game.exists or game.to_dict().get('user_id') != current_user.id:
        return False, "Game not found or access denied"

    results_ref = db.collection('game_results').document()
    results_ref.set({
        'game_id': game_id,
        'time_seconds': time_seconds,
        'correct_matches': correct,
        'total_pairs': total,
        'created_at': datetime.now(),
        'user_id': current_user.id
    })

    game_ref.update({'completed': True})
    return True, None

# Authentication Routes
@app.route('/login')
def login():
    return render_template("login.html", google_client_id=GOOGLE_CLIENT_ID)



@app.route('/login/google', methods=['POST'])
def google_login():
    token = request.json.get('token')
    if not token:
        return jsonify({'success': False, 'error': 'Token missing'}), 400

    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID)

        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        user_id = idinfo['sub']
        user_ref = db.collection('users').document(user_id)
        user_data = user_ref.get()

        if not user_data.exists:
            user_ref.set({
                'email': idinfo['email'],
                'name': idinfo.get('name', ''),
                'picture': idinfo.get('picture', ''),
                'created_at': datetime.now(),
                'last_login': datetime.now()
            })
        else:
            user_ref.update({'last_login': datetime.now()})

        user = User(
            id_=user_id,
            email=idinfo['email'],
            name=idinfo.get('name', ''),
            picture=idinfo.get('picture', '')
        )

        # Critical for persistent login
        login_user(user, remember=True)

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'picture': user.picture
            }
        })

    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'success': True})


@app.route('/api/user')
@login_required
def get_user():
    return jsonify({
        'success': True,
        'user': {
            'id': current_user.id,
            'email': current_user.email,
            'name': current_user.name,
            'picture': current_user.picture
        }
    })

# Main Page Routes
@app.route('/')
def home():
    return render_template('home.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/game')
@login_required
def game_page():
    return render_template('game.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/flashcards')
@login_required
def flashcards_page():
    return render_template('flashcards.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/notes')
@login_required
def notes_page():
    return render_template('notes.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/notes/editor')
@login_required
def notes_editor_page():
    lecture_title = request.args.get('lecture')
    note_id = request.args.get('id')
    return render_template('notes_editor.html', google_client_id=GOOGLE_CLIENT_ID, lecture=lecture_title, note_id=note_id)
# Static Files Route
@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('../../nsu_project/some new stuff i dont want to include/static', path)

# API Routes
@app.route('/api/matching-game', methods=['POST'])
@login_required
def create_matching_game():
    data = request.get_json()
    terms = data.get('terms', [])
    definitions = data.get('definitions', [])
    save_for_later = data.get('save_flashcards', False)
    title = data.get('flashcard_title', 'Untitled Flashcards')

    is_valid, error = validate_game_input(terms, definitions)
    if not is_valid:
        return jsonify({'success': False, 'error': error}), 400

    game_ref, shuffled_defs, error = create_game_record(terms, definitions)
    if error:
        return jsonify({'success': False, 'error': error}), 401

    response = {
        'success': True,
        'game_id': game_ref.id,
        'terms': terms,
        'definitions': shuffled_defs
    }

    if save_for_later:
        flashcard_ref, error = save_flashcard_set(terms, definitions, title, game_ref.id)
        if error:
            return jsonify({'success': False, 'error': error}), 401
        response['saved_flashcard_id'] = flashcard_ref.id

    return jsonify(response)

@app.route('/api/game-results', methods=['POST'])
@login_required
def save_results():
    data = request.get_json()

    try:
        required_fields = ['game_id', 'time_seconds', 'correct_matches', 'total_pairs']
        if not all(field in data for field in required_fields):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400

        success, error = save_game_results(
            data['game_id'],
            data['time_seconds'],
            data['correct_matches'],
            data['total_pairs']
        )

        if not success:
            return jsonify({'success': False, 'error': error}), 401

        return jsonify({'success': True})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/saved-flashcards', methods=['GET'])
@login_required
def get_saved_flashcards():
    try:
        flashcards = [
            {**doc.to_dict(), 'id': doc.id}
            for doc in db.collection('saved_flashcards')
                .where('user_id', '==', current_user.id)
                .stream()
        ]
        return jsonify({'success': True, 'flashcards': flashcards})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/save-flashcards', methods=['POST'])
@login_required
def save_flashcards_only():
    data = request.get_json()
    terms = data.get('terms', [])
    definitions = data.get('definitions', [])
    title = data.get('flashcard_title', 'Untitled Flashcards')

    is_valid, error = validate_game_input(terms, definitions)
    if not is_valid:
        return jsonify({'success': False, 'error': error}), 400

    try:
        flashcard_ref = db.collection('saved_flashcards').document()
        flashcard_ref.set({
            'title': title,
            'terms': terms,
            'definitions': definitions,
            'created_at': datetime.now(),
            'last_updated': datetime.now(),
            'user_id': current_user.id
        })

        return jsonify({'success': True, 'flashcard_id': flashcard_ref.id})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/update-flashcard/<flashcard_id>', methods=['PUT'])
@login_required
def update_flashcard(flashcard_id):
    try:
        data = request.get_json()
        flashcard_ref = db.collection('saved_flashcards').document(flashcard_id)
        flashcard = flashcard_ref.get()

        if not flashcard.exists or flashcard.to_dict().get('user_id') != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized access'}), 403

        update_data = {'last_updated': datetime.now()}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'terms' in data:
            update_data['terms'] = data['terms']
        if 'definitions' in data:
            update_data['definitions'] = data['definitions']

        flashcard_ref.update(update_data)
        return jsonify({'success': True, 'message': 'Flashcard updated successfully'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/delete-flashcard/<flashcard_id>', methods=['DELETE'])
@login_required
def delete_flashcard(flashcard_id):
    try:
        flashcard_ref = db.collection('saved_flashcards').document(flashcard_id)
        flashcard = flashcard_ref.get()

        if not flashcard.exists or flashcard.to_dict().get('user_id') != current_user.id:
            return jsonify({'success': False, 'error': 'Unauthorized access'}), 403

        flashcard_ref.delete()
        return jsonify({'success': True, 'message': 'Flashcard deleted successfully'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
@login_required
def create_note():
    data = request.get_json()
    title = data.get('title', 'Untitled Note')
    content = data.get('content', '')
    lecture_title = data.get('lecture_title')

    if not lecture_title:
        return jsonify({'success': False, 'error': 'lecture_title is required'}), 400

    note_ref = db.collection('notes').document()
    note_ref.set({
        'title': title,
        'content': content,
        'lecture_title': lecture_title,  #  add this
        'created_at': datetime.now(),
        'last_updated': datetime.now(),
        'user_id': current_user.id
    })

    return jsonify({'success': True, 'note_id': note_ref.id})


@app.route('/api/notes', methods=['GET'])
@login_required
def get_notes():
    try:
        notes = [
            {**doc.to_dict(), 'id': doc.id}
            for doc in db.collection('notes')
                .where('user_id', '==', current_user.id)
                .stream()
        ]
        return jsonify({'success': True, 'notes': notes})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/notes/<note_id>', methods=['GET'])
@login_required
def get_note(note_id):
    try:
        note_ref = db.collection('notes').document(note_id)
        note = note_ref.get()

        if not note.exists or note.to_dict().get('user_id') != current_user.id:
            return jsonify({'success': False, 'error': 'Note not found or unauthorized'}), 403

        return jsonify({'success': True, 'note': note.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/notes/<note_id>', methods=['PUT'])
@login_required
def update_note(note_id):
    data = request.get_json()
    note_ref = db.collection('notes').document(note_id)
    note = note_ref.get()

    if not note.exists or note.to_dict().get('user_id') != current_user.id:
        return jsonify({'success': False, 'error': 'Note not found or unauthorized'}), 403

    note_ref.update({
        'title': data.get('title', note.to_dict().get('title')),
        'content': data.get('content', note.to_dict().get('content')),
        'last_updated': datetime.now()
    })

    return jsonify({'success': True, 'message': 'Note updated'})

@app.route('/api/notes/<note_id>', methods=['DELETE'])
@login_required
def delete_note(note_id):
    note_ref = db.collection('notes').document(note_id)
    note = note_ref.get()

    if not note.exists or note.to_dict().get('user_id') != current_user.id:
        return jsonify({'success': False, 'error': 'Note not found or unauthorized'}), 403

    note_ref.delete()
    return jsonify({'success': True, 'message': 'Note deleted'})

@app.route('/api/lecture_titles', methods=['GET'])
@login_required
def get_lecture_titles():
    try:
        notes_ref = db.collection('notes').where('user_id', '==', current_user.id)
        notes = notes_ref.stream()

        lecture_map = {}
        for doc in notes:
            data = doc.to_dict()
            lecture_title = data.get('lecture_title')
            if not lecture_title:
                continue

            # Only store the first note as summary per lecture
            if lecture_title not in lecture_map:
                summary = data.get('content', '')[:100].strip()
                if len(data.get('content', '')) > 100:
                    summary += "..."
                lecture_map[lecture_title] = {
                    'lecture_title': lecture_title,
                    'summary': summary
                }

        return jsonify({'success': True, 'lectures': list(lecture_map.values())})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/lectures', methods=['POST'])
@login_required
def add_lecture():
    data = request.get_json()
    lecture_title = data.get('lecture_title')

    if not lecture_title:
        return jsonify({'success': False, 'error': 'Lecture title is required'}), 400

    lecture_ref = db.collection('lectures').document()
    lecture_ref.set({
        'lecture_title': lecture_title,
        'summary': '',
        'created_at': datetime.now(),
        'user_id': current_user.id
    })

    return jsonify({'success': True, 'lecture_id': lecture_ref.id})

@app.route('/settings')
@login_required
def settings_page():
    return render_template('settings.html', google_client_id=GOOGLE_CLIENT_ID)

@app.route('/api/settings', methods=['POST'])
@login_required
def save_user_settings():
    data = request.get_json()
    settings_ref = db.collection('user_settings').document(current_user.id)
    settings_ref.set({
        'display_name': data.get('display_name', ''),
        'theme': data.get('theme', 'Light'),
        'email_notifications': data.get('email_notifications', False),
        'updated_at': datetime.now()
    }, merge=True)
    return jsonify({'success': True, 'message': 'Settings saved'})

@app.route('/api/settings', methods=['GET'])
@login_required
def get_user_settings():
    ref = db.collection('user_settings').document(current_user.id).get()
    if ref.exists:
        return jsonify({'success': True, 'settings': ref.to_dict()})
    return jsonify({'success': False})

@app.route('/api/lectures/<lecture_title>', methods=['DELETE'])
@login_required
def delete_lecture(lecture_title):
    try:
        # Delete notes under this lecture
        notes_query = db.collection('notes')\
            .where('user_id', '==', current_user.id)\
            .where('lecture_title', '==', lecture_title)\
            .stream()

        for note in notes_query:
            note.reference.delete()

        # Delete lecture entry if it exists
        lectures = db.collection('lectures')\
            .where('user_id', '==', current_user.id)\
            .where('lecture_title', '==', lecture_title)\
            .stream()

        for doc in lectures:
            doc.reference.delete()

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/test')
@login_required
def test_page():
    return render_template('test.html')


@app.route('/api/save-quiz-result', methods=['POST'])
@login_required
def save_quiz_result():
    try:
        data = request.get_json()
        db.collection('quiz_results').add({
            'user_id': current_user.id,
            'set_title': data.get('set_title'),
            'mode': data.get('mode'),
            'score': data.get('score'),
            'total': data.get('total'),
            'answers': data.get('answers'),
            'timestamp': datetime.now()
        })
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500





if __name__ == '__main__':
    # Remove the adhoc cert:
    app.run(debug=True)



# And remove or comment this:
# app.config['SESSION_COOKIE_SECURE'] = True

