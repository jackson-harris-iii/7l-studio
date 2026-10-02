"""Dependency-free checks for portfolio document integrity."""
from html.parser import HTMLParser
from pathlib import Path

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.anchors = []
        self.errors = []
    def handle_starttag(self, tag, items):
        attrs = dict(items)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a':
            href = attrs.get('href', '')
            if href.startswith('#'):
                self.anchors.append(href[1:])
            if attrs.get('target') == '_blank' and 'noopener' not in attrs.get('rel', '').split():
                self.errors.append('New-tab link missing noopener')
        if tag == 'img' and 'alt' not in attrs:
            self.errors.append('Image missing alternative text')

page = Page()
page.feed(Path(__file__).with_name('index.html').read_text())
assert len(page.ids) == len(set(page.ids)), 'Duplicate element IDs'
assert set(page.anchors) <= set(page.ids), 'Broken local navigation'
assert not page.errors, page.errors
print('PASS: unique IDs, navigation targets, image alt attributes, external-link isolation')
