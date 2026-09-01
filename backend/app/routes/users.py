from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import db, User, PromptLog
from sqlalchemy import or_, desc, asc
import re

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


def is_valid_email(email):
    """Validasi format email dasar."""
    pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
    return bool(re.match(pattern, email))


def is_valid_username(username):
    """Validasi format username (hanya huruf, angka, titik, underscore, min 3 karakter)."""
    pattern = r'^[a-zA-Z0-9._]{3,80}$'
    return bool(re.match(pattern, username))


@users_bp.route('', methods=['GET'])
def get_users():
    """
    Mengambil daftar seluruh pengguna dengan filter pencarian, filter role, dan pagination.
    ---
    tags:
      - User Management
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 10
      - name: search
        in: query
        type: string
      - name: role
        in: query
        type: string
        enum: [all, admin, user]
    responses:
      200:
        description: Daftar pengguna berhasil diambil.
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        search = request.args.get('search', '', type=str).strip()
        role = request.args.get('role', 'admin', type=str).strip().lower()
        sort_by = request.args.get('sort_by', 'created_at', type=str)
        order = request.args.get('order', 'desc', type=str).lower()

        query = User.query

        # Filter pencarian
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                or_(
                    User.username.ilike(search_filter),
                    User.name.ilike(search_filter),
                    User.email.ilike(search_filter)
                )
            )

        # Filter role (default admin untuk manajemen akun admin)
        if role in ['admin', 'user']:
            query = query.filter(User.role == role)

        # Sorting
        sort_column = getattr(User, sort_by, User.created_at)
        if order == 'asc':
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))

        # Eksekusi pagination
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        users_data = [user.to_dict() for user in pagination.items]

        return jsonify({
            'users': users_data,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': pagination.page,
            'per_page': pagination.per_page
        }), 200

    except Exception as e:
        return jsonify({'error': f"Gagal mengambil data pengguna: {str(e)}"}), 500


@users_bp.route('/stats', methods=['GET'])
def get_user_stats():
    """
    Mengambil ringkasan statistik pengguna.
    ---
    tags:
      - User Management
    responses:
      200:
        description: Ringkasan statistik pengguna.
    """
    try:
        total_users = User.query.count()
        total_admins = User.query.filter_by(role='admin').count()
        total_regular_users = User.query.filter_by(role='user').count()
        total_google_users = User.query.filter(User.google_id.isnot(None)).count()

        return jsonify({
            'total_users': total_users,
            'total_admins': total_admins,
            'total_regular_users': total_regular_users,
            'total_google_users': total_google_users
        }), 200

    except Exception as e:
        return jsonify({'error': f"Gagal mengambil statistik pengguna: {str(e)}"}), 500


@users_bp.route('', methods=['POST'])
def create_user():
    """
    Membuat akun pengguna atau admin baru secara manual via GUI.
    ---
    tags:
      - User Management
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - email
            - username
          properties:
            email:
              type: string
              example: "admin.baru@bps.go.id"
            username:
              type: string
              example: "adminbaru"
            name:
              type: string
              example: "Admin Baru"
            role:
              type: string
              enum: [admin, user]
              default: "admin"
    responses:
      201:
        description: Pengguna berhasil dibuat.
      400:
        description: Validasi input gagal atau akun sudah terdaftar.
    """
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        username = data.get('username', '').strip().lower()
        name = data.get('name', '').strip()
        role = data.get('role', 'admin').strip().lower()

        # Validasi field wajib
        if not email or not username:
            return jsonify({'error': 'Email dan Username wajib diisi.'}), 400

        if not is_valid_email(email):
            return jsonify({'error': 'Format email tidak valid.'}), 400

        if not is_valid_username(username):
            return jsonify({'error': 'Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, atau garis bawah (_).'}), 400

        if role not in ['admin', 'user']:
            role = 'admin'

        # Cek duplikasi email
        if User.query.filter_by(email=email).first():
            return jsonify({'error': f"Akun dengan email '{email}' sudah terdaftar."}), 400

        # Cek duplikasi username
        if User.query.filter_by(username=username).first():
            return jsonify({'error': f"Username '{username}' sudah digunakan."}), 400

        # Buat user baru
        new_user = User(
            email=email,
            username=username,
            name=name if name else username,
            role=role
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'message': f"Akun '{new_user.username}' ({new_user.role.upper()}) berhasil dibuat.",
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Gagal membuat akun: {str(e)}"}), 500


@users_bp.route('/<int:user_id>', methods=['GET'])
def get_user_detail(user_id):
    """
    Mengambil detail satu pengguna berdasarkan ID.
    """
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'Pengguna tidak ditemukan.'}), 404
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """
    Memperbarui data pengguna (nama, username, email, role).
    ---
    tags:
      - User Management
    responses:
      200:
        description: Data pengguna berhasil diperbarui.
    """
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'Pengguna tidak ditemukan.'}), 404

        data = request.get_json() or {}
        email = data.get('email', '').strip().lower() if 'email' in data else user.email
        username = data.get('username', '').strip().lower() if 'username' in data else user.username
        name = data.get('name', '').strip() if 'name' in data else user.name
        role = data.get('role', user.role).strip().lower() if 'role' in data else user.role

        if not email or not is_valid_email(email):
            return jsonify({'error': 'Format email tidak valid.'}), 400

        if not username or not is_valid_username(username):
            return jsonify({'error': 'Username minimal 3 karakter dan hanya boleh berisi huruf, angka, titik, atau garis bawah (_).'}), 400

        if role not in ['admin', 'user']:
            role = user.role

        # Cek jika email diganti dan bentrok dengan user lain
        if email != user.email:
            existing_email = User.query.filter(User.email == email, User.id != user.id).first()
            if existing_email:
                return jsonify({'error': f"Email '{email}' sudah digunakan oleh pengguna lain."}), 400

        # Cek jika username diganti dan bentrok dengan user lain
        if username != user.username:
            existing_username = User.query.filter(User.username == username, User.id != user.id).first()
            if existing_username:
                return jsonify({'error': f"Username '{username}' sudah digunakan oleh pengguna lain."}), 400

        # Cegah demosi admin terakhir
        if user.role == 'admin' and role == 'user':
            admin_count = User.query.filter_by(role='admin').count()
            if admin_count <= 1:
                return jsonify({'error': 'Tidak dapat mengubah role Admin terakhir menjadi User reguler.'}), 400

        user.email = email
        user.username = username
        user.name = name if name else username
        user.role = role

        db.session.commit()

        return jsonify({
            'message': f"Data pengguna '{user.username}' berhasil diperbarui.",
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Gagal memperbarui pengguna: {str(e)}"}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """
    Menghapus akun pengguna dari sistem.
    ---
    tags:
      - User Management
    responses:
      200:
        description: Pengguna berhasil dihapus.
      400:
        description: Gagal karena alasan keamanan (misal admin terakhir).
    """
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'Pengguna tidak ditemukan.'}), 404

        # Cegah menghapus admin terakhir
        if user.role == 'admin':
            admin_count = User.query.filter_by(role='admin').count()
            if admin_count <= 1:
                return jsonify({'error': 'Tidak dapat menghapus Administrator terakhir di sistem.'}), 400

        username_deleted = user.username

        # Set user_id pada PromptLog menjadi NULL agar riwayat prompt tidak hilang
        PromptLog.query.filter_by(user_id=user.id).update({'user_id': None})

        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'message': f"Akun '{username_deleted}' berhasil dihapus dari sistem."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Gagal menghapus pengguna: {str(e)}"}), 500
