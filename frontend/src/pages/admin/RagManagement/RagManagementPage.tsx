import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import MiniPagination from '../../../components/admin/MiniPagination';
import {
  aiMetricsApi,
  type RagDocumentMetric,
  RAG_INDEX_STATUS,
  type RagIndexStatus,
} from '../../../api/admin/aiMetricsApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/ai-metrics.css';

type Tone = 'normal' | 'warning' | 'danger';

const DOC_PAGE_SIZE = 5;
const MAX_RAG_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_RAG_UPLOAD_EXTENSIONS = ['pdf', 'txt', 'md'] as const;
const TEXT_RAG_UPLOAD_EXTENSIONS = ['txt', 'md'] as const;
const RAG_DOCUMENTS_QUERY_KEY = ['admin', 'ragManagement', 'documents'] as const;

const getApiErrorStatus = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
};

const getApiErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message;
};

const getApiStateMessage = (error: unknown, fallback: string) => {
  const status = getApiErrorStatus(error);
  if (status === 401) return '로그인이 만료되어 요청을 처리할 수 없습니다. 다시 로그인해 주세요.';
  if (status === 403) return '관리자 권한이 없어 요청을 처리할 수 없습니다.';
  const message = getApiErrorMessage(error);
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
};

const isAllowedRagUploadFile = (file: Pick<File, 'name' | 'type'>) => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const hasAllowedExtension = ALLOWED_RAG_UPLOAD_EXTENSIONS.includes(
    fileExtension as (typeof ALLOWED_RAG_UPLOAD_EXTENSIONS)[number]
  );

  if (!hasAllowedExtension) {
    return false;
  }

  if (!file.type) {
    return true;
  }

  if (fileExtension === 'pdf') {
    return file.type === 'application/pdf';
  }

  if (TEXT_RAG_UPLOAD_EXTENSIONS.includes(fileExtension as (typeof TEXT_RAG_UPLOAD_EXTENSIONS)[number])) {
    return file.type.startsWith('text/');
  }

  return false;
};

const getRagStatusTone = (status: RagIndexStatus): Tone => {
  if (status === RAG_INDEX_STATUS.FAILED) return 'danger';
  if (status === RAG_INDEX_STATUS.INDEXING || status === RAG_INDEX_STATUS.DELETING) return 'warning';
  return 'normal';
};

const getRagStatusLabel = (status: RagIndexStatus) => {
  if (status === RAG_INDEX_STATUS.FAILED) return '실패';
  if (status === RAG_INDEX_STATUS.INDEXING) return '인덱싱 중';
  if (status === RAG_INDEX_STATUS.DELETING) return '삭제 중';
  return '동기화됨';
};

const formatUpdatedAtLabel = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function RagManagementPage() {
  const queryClient = useQueryClient();
  const ragUploadInputRef = useRef<HTMLInputElement | null>(null);

  const [docQuery, setDocQuery] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [deletingDocId, setDeletingDocId] = useState('');
  const [docPage, setDocPage] = useState(1);
  const [ragUploadErrorMessage, setRagUploadErrorMessage] = useState('');
  const [ragActionErrorMessage, setRagActionErrorMessage] = useState('');

  const {
    data: ragDocumentsData,
    isLoading: ragDocumentsLoading,
    isError: ragDocumentsIsError,
    error: ragDocumentsError,
  } = useQuery<RagDocumentMetric[], Error>({
    queryKey: RAG_DOCUMENTS_QUERY_KEY,
    queryFn: async () => {
      const response = await aiMetricsApi.getRagDocuments();
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 상태 조회에 실패했습니다.');
      return response.data.data;
    },
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some((doc) => doc.status === RAG_INDEX_STATUS.INDEXING) ? 3000 : false;
    },
  });

  const ragDocs = ragDocumentsData ?? [];
  const ragDocsEmpty = !ragDocumentsLoading && !ragDocumentsIsError && ragDocs.length === 0;

  const uploadRagDocumentMutation = useMutation<RagDocumentMetric, Error, File>({
    mutationFn: async (file) => {
      const response = await aiMetricsApi.uploadRagDocument({ file });
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 업로드에 실패했습니다.');
      return response.data.data;
    },
    onMutate: () => {
      setRagActionErrorMessage('');
    },
    onSuccess: async (uploadedDocument) => {
      setDocQuery('');
      setDocPage(1);
      setSelectedDocId(uploadedDocument.documentId);
      setRagActionErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
    },
    onError: (error) => {
      setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 업로드에 실패했습니다.'));
    },
  });

  const deleteRagDocumentMutation = useMutation<null, Error, string, { previousRagDocuments?: RagDocumentMetric[] }>({
    mutationFn: async (documentId) => {
      const response = await aiMetricsApi.deleteRagDocument(documentId);
      if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 삭제에 실패했습니다.');
      return response.data.data;
    },
    onMutate: async (documentId) => {
      setRagActionErrorMessage('');
      await queryClient.cancelQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
      const previousRagDocuments = queryClient.getQueryData<RagDocumentMetric[]>(RAG_DOCUMENTS_QUERY_KEY);
      setDeletingDocId(documentId);
      queryClient.setQueryData<RagDocumentMetric[]>(RAG_DOCUMENTS_QUERY_KEY, (current = []) =>
        current.map((doc) =>
          doc.documentId === documentId
            ? {
                ...doc,
                status: RAG_INDEX_STATUS.DELETING,
              }
            : doc
        )
      );
      return { previousRagDocuments };
    },
    onSuccess: async (_, documentId) => {
      if (selectedDocId === documentId) {
        setSelectedDocId('');
      }
      setRagActionErrorMessage('');
      await queryClient.invalidateQueries({ queryKey: RAG_DOCUMENTS_QUERY_KEY });
    },
    onError: (error, _documentId, context) => {
      if (context?.previousRagDocuments) {
        queryClient.setQueryData(RAG_DOCUMENTS_QUERY_KEY, context.previousRagDocuments);
      }
      setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 삭제에 실패했습니다.'));
    },
    onSettled: () => {
      setDeletingDocId('');
    },
  });

  const filteredDocs = useMemo(() => {
    const keyword = docQuery.trim().toLowerCase();
    if (!keyword) return ragDocs;
    return ragDocs.filter((doc) => doc.name.toLowerCase().includes(keyword));
  }, [docQuery, ragDocs]);

  useEffect(() => {
    if (ragDocs.length === 0) {
      if (selectedDocId) setSelectedDocId('');
      return;
    }

    if (!ragDocs.some((doc) => doc.documentId === selectedDocId)) {
      setSelectedDocId(ragDocs[0].documentId);
    }
  }, [ragDocs, selectedDocId]);

  const selectedDoc = useMemo(
    () => ragDocs.find((doc) => doc.documentId === selectedDocId) ?? ragDocs[0],
    [ragDocs, selectedDocId]
  );

  const syncedCount = useMemo(
    () => ragDocs.filter((doc) => doc.status === RAG_INDEX_STATUS.SYNCED).length,
    [ragDocs]
  );

  const indexingCount = useMemo(
    () => ragDocs.filter((doc) => doc.status === RAG_INDEX_STATUS.INDEXING).length,
    [ragDocs]
  );

  const failedCount = useMemo(
    () => ragDocs.filter((doc) => doc.status === RAG_INDEX_STATUS.FAILED).length,
    [ragDocs]
  );

  const docTotalPages = Math.max(1, Math.ceil(filteredDocs.length / DOC_PAGE_SIZE));
  const pagedDocs = useMemo(() => {
    const start = (docPage - 1) * DOC_PAGE_SIZE;
    return filteredDocs.slice(start, start + DOC_PAGE_SIZE);
  }, [docPage, filteredDocs]);
  const emptyDocRows = ragDocumentsLoading || ragDocumentsIsError || ragDocsEmpty ? 0 : DOC_PAGE_SIZE - pagedDocs.length;

  useEffect(() => {
    setDocPage((prev) => Math.min(prev, docTotalPages));
  }, [docTotalPages]);

  const handleDownloadDocument = (doc: RagDocumentMetric) => {
    void (async () => {
      try {
        setRagActionErrorMessage('');
        const response = await aiMetricsApi.downloadRagDocument(doc.documentId);
        if (!response.data.success) throw new Error(response.data.message ?? 'RAG 문서 다운로드 정보 조회에 실패했습니다.');
        const download = response.data.data;
        const anchor = document.createElement('a');
        anchor.href = download.downloadUrl;
        anchor.download = download.name;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } catch (error) {
        setRagActionErrorMessage(getApiStateMessage(error, 'RAG 문서 다운로드에 실패했습니다.'));
      }
    })();
  };

  const handleUploadButtonClick = () => {
    ragUploadInputRef.current?.click();
  };

  const handleUploadFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.trim()) {
      setRagUploadErrorMessage('업로드할 문서 파일을 다시 선택해 주세요.');
      return;
    }

    if (!isAllowedRagUploadFile(file)) {
      setRagUploadErrorMessage('PDF, TXT, MD 형식의 문서만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > MAX_RAG_UPLOAD_FILE_SIZE) {
      setRagUploadErrorMessage('업로드 가능한 최대 파일 크기인 10MB를 초과했습니다.');
      return;
    }

    setRagUploadErrorMessage('');
    uploadRagDocumentMutation.mutate(file);
  };

  const handleDeleteDocument = (documentId: string) => {
    deleteRagDocumentMutation.mutate(documentId);
  };

  return (
    <section className="aiOpsPage">
      <header className="admin-header">
        <div>
          <h2>RAG 관리</h2>
          <p>관리자 AI가 참조할 문서를 업로드하고 인덱싱 상태를 관리합니다.</p>
        </div>
      </header>

      <section className="admin-card aiOpsRagCard">
        <div className="aiOpsPanelHead compact">
          <div>
            <span className="aiOpsEyebrow">RAG 지식 베이스 관리</span>
            <h3>{selectedDoc?.name ?? 'RAG 문서 상태'}</h3>
          </div>
        </div>

        <div className="dashboardStateBox dashboardStateBox--inline">
          업로드한 문서는 인덱싱 후 관리자 AI가 참조할 수 있는 기반 데이터로 관리됩니다. 실제 활용 기능 연결은 후속 작업에서 확장됩니다.
        </div>

        <div className="aiOpsRagSummary">
          <div className="aiOpsRagSummaryList">
            <article className="aiOpsRagSummaryItem">
              <span>전체 문서</span>
              <strong>{ragDocs.length.toLocaleString()}</strong>
            </article>
            <article className="aiOpsRagSummaryItem">
              <span>동기화 완료</span>
              <strong>{syncedCount.toLocaleString()}</strong>
            </article>
            <article className="aiOpsRagSummaryItem">
              <span>인덱싱 중</span>
              <strong>{indexingCount.toLocaleString()}</strong>
            </article>
            <article className="aiOpsRagSummaryItem">
              <span>실패</span>
              <strong>{failedCount.toLocaleString()}</strong>
            </article>
          </div>

          <div className="aiOpsRagSelectionCard">
            <span className="aiOpsEyebrow">선택 문서</span>
            <strong>{selectedDoc?.name ?? '선택된 문서 없음'}</strong>
            <div className="aiOpsRagSelectionMeta">
              <span>청크 {selectedDoc?.chunkCount?.toLocaleString() ?? 0}</span>
              <span>{selectedDoc ? getRagStatusLabel(selectedDoc.status) : '대기'}</span>
              <span>수정 {formatUpdatedAtLabel(selectedDoc?.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="aiOpsRagLayout">
          <aside className="aiOpsUploadCard">
            <input
              ref={ragUploadInputRef}
              type="file"
              className="aiOpsUploadInput"
              accept=".pdf,.txt,.md"
              onChange={(event) => {
                void handleUploadFileChange(event);
              }}
            />
            <div className="aiOpsUploadIcon">
              <span />
            </div>
            <strong>인프라 문서 업로드</strong>
            <span>PDF, TXT, MD 최대 10MB</span>
            <small>업로드 후 인덱싱 상태를 여기서 바로 확인할 수 있습니다.</small>
            {ragUploadErrorMessage ? (
              <div className="aiOpsUploadError" role="alert">
                {ragUploadErrorMessage}
              </div>
            ) : null}
            {ragActionErrorMessage ? (
              <div className="aiOpsUploadError" role="alert">
                {ragActionErrorMessage}
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleUploadButtonClick}
              disabled={uploadRagDocumentMutation.isPending}
            >
              {uploadRagDocumentMutation.isPending ? '업로드 중' : '업로드 및 임베딩'}
            </button>
          </aside>

          <div className="aiOpsRagTableBlock">
            <div className="aiOpsSearchRow">
              <span className="aiOpsSearchIcon small" />
              <input
                type="text"
                value={docQuery}
                onChange={(event) => {
                  setDocQuery(event.target.value);
                  setDocPage(1);
                }}
                placeholder="문서명 검색..."
              />
            </div>

            <div className="aiOpsTableWrap ragFixed">
              <table className="aiOpsTable">
                <colgroup>
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>문서명</th>
                    <th>청크</th>
                    <th>현재 진행도</th>
                    <th>상태</th>
                    <th>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {(ragDocumentsLoading || ragDocumentsIsError || ragDocsEmpty) && (
                    <tr className="placeholder">
                      <td colSpan={5}>
                        {ragDocumentsIsError
                          ? getApiStateMessage(ragDocumentsError, 'RAG 문서 상태를 불러오지 못했습니다.')
                          : ragDocsEmpty
                            ? '등록된 RAG 문서가 없습니다.'
                            : 'RAG 문서 상태를 불러오는 중입니다.'}
                      </td>
                    </tr>
                  )}
                  {pagedDocs.map((doc) => (
                    <tr
                      key={doc.documentId}
                      className={selectedDocId === doc.documentId ? 'selected' : ''}
                      onClick={() => setSelectedDocId(doc.documentId)}
                    >
                      <td>{doc.name}</td>
                      <td>{doc.chunkCount.toLocaleString()}</td>
                      <td>
                        <div className="aiOpsInlineProgress">
                          <div style={{ width: `${doc.progressPercent}%` }} />
                        </div>
                      </td>
                      <td>
                        <span className={`aiOpsBadge ${getRagStatusTone(doc.status)}`}>{getRagStatusLabel(doc.status)}</span>
                      </td>
                      <td>
                        <button type="button" className="aiOpsTextButton" disabled title="준비 중">
                          재인덱싱
                        </button>
                        <button
                          type="button"
                          className="aiOpsTextButton"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDownloadDocument(doc);
                          }}
                        >
                          다운로드
                        </button>
                        <button
                          type="button"
                          className="aiOpsTextButton danger"
                          disabled={deleteRagDocumentMutation.isPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteDocument(doc.documentId);
                          }}
                        >
                          {deleteRagDocumentMutation.isPending && deletingDocId === doc.documentId ? '삭제 중' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: emptyDocRows }, (_, index) => (
                    <tr key={`doc-placeholder-${index}`} className="placeholder" aria-hidden="true">
                      <td colSpan={5} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MiniPagination
              page={docPage}
              totalPages={docTotalPages}
              onChange={setDocPage}
              className="aiOpsPagination"
              showWhenSingle
            />
          </div>
        </div>
      </section>
    </section>
  );
}
