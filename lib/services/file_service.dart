/**
 * The one place the app uploads and opens files. It talks to the files-upload
 * and files-sign Edge Functions, which check the real file type, enforce the
 * size limit, build the {tenant_id}/{type}/{id}/{file} path and return signed,
 * short-lived links. Do not call supabase.storage directly anywhere else.
 */

import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

enum UploadType { logos, materials, submissions }

class UploadedFile {
  const UploadedFile({
    required this.id,
    required this.storagePath,
    required this.originalName,
    required this.mimeType,
    required this.sizeBytes,
  });

  final String id;
  final String storagePath;
  final String originalName;
  final String mimeType;
  final int sizeBytes;
}

/** A refused upload or download. [message] is written for the user and can be
 * shown as is; [code] is for logic (for example 'file_too_large').
 */
class FileServiceException implements Exception {
  const FileServiceException(this.code, this.message, {this.status});

  final String code;
  final String message;
  final int? status;

  @override
  String toString() => message;
}

class FileService {
  FileService(this._client);

  final SupabaseClient _client;

  /** Uploads [bytes] for the signed-in user's own school. The school is taken
   * from the user's session on the server, never from this call.
   */
  Future<UploadedFile> upload({
    required UploadType type,
    required String fileName,
    required Uint8List bytes,
  }) async {
    try {
      final res = await _client.functions.invoke(
        'files-upload',
        headers: {
          'x-upload-type': type.name,
          'x-file-name': Uri.encodeComponent(fileName),
        },
        body: bytes,
      );
      final file = (res.data as Map)['file'] as Map;
      return UploadedFile(
        id: file['id'] as String,
        storagePath: file['storage_path'] as String,
        originalName: file['original_name'] as String,
        mimeType: file['mime_type'] as String,
        sizeBytes: (file['size_bytes'] as num).toInt(),
      );
    } on FunctionException catch (e) {
      throw _toException(e);
    }
  }

  /** A signed link for [fileId] that stops working after [expiresInSeconds]
   * (default 60, at most 300). Ask for a new one each time the user opens the
   * file; never store the link.
  */
  Future<Uri> signedUrl(String fileId, {int? expiresInSeconds}) async {
    try {
      final res = await _client.functions.invoke(
        'files-sign',
        body: {
          'file_id': fileId,
          if (expiresInSeconds != null) 'expires_in': expiresInSeconds,
        },
      );
      return Uri.parse((res.data as Map)['url'] as String);
    } on FunctionException catch (e) {
      throw _toException(e);
    }
  }

  FileServiceException _toException(FunctionException e) {
    final details = e.details;
    if (details is Map && details['error'] is Map) {
      final err = details['error'] as Map;
      return FileServiceException(
        (err['code'] ?? 'unknown').toString(),
        (err['message'] ?? 'The file could not be processed.').toString(),
        status: e.status,
      );
    }
    return FileServiceException(
      'unknown',
      'The file could not be processed. Please try again.',
      status: e.status,
    );
  }
}